package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminFileMapper;
import com.scaffold.admin.mapper.AdminUserMapper;
import com.scaffold.admin.model.entity.AdminFile;
import com.scaffold.admin.model.entity.AdminUser;
import com.scaffold.admin.model.vo.FileUploadVO;
import com.scaffold.admin.service.FileService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl.AdminUserDetails;
import com.scaffold.admin.util.SecurityUtils;
import io.minio.*;
import io.minio.messages.Bucket;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private static final long MAX_AVATAR_SIZE = 2 * 1024 * 1024;
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
    private static final Set<String> AVATAR_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    private final MinioClient minioClient;
    private final AdminFileMapper fileMapper;
    private final AdminUserMapper userMapper;

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${app.file.recycle-bin-retention-days:7}")
    private int recycleBinRetentionDays;

    // ==================== 上传 ====================

    @Override
    public FileUploadVO uploadFile(MultipartFile file, String category) {
        if (file.isEmpty()) throw new BusinessException(ResultCode.PARAM_ERROR, "文件不能为空");
        if (file.getSize() > MAX_FILE_SIZE) throw new BusinessException(ResultCode.PARAM_ERROR, "文件大小不能超过50MB");
        String dir = category != null ? category : "general";
        return doUpload(file, dir, dir);
    }

    @Override
    public FileUploadVO uploadAvatar(MultipartFile file) {
        if (file.isEmpty()) throw new BusinessException(ResultCode.PARAM_ERROR, "文件不能为空");
        if (file.getSize() > MAX_AVATAR_SIZE) throw new BusinessException(ResultCode.PARAM_ERROR, "��像大小不能超过2MB");
        String contentType = file.getContentType();
        if (contentType == null || !AVATAR_TYPES.contains(contentType.toLowerCase()))
            throw new BusinessException(ResultCode.PARAM_ERROR, "头像仅支持 jpg/png/gif/webp 格式");
        return doUpload(file, "avatars", "avatar");
    }

    // ==================== 查询 ====================

    @Override
    public Page<AdminFile> listFiles(Integer pageNum, Integer pageSize, String bucket, String category, String status, String keyword) {
        Page<AdminFile> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminFile> query = new LambdaQueryWrapper<>();
        if (bucket != null && !bucket.isBlank()) query.eq(AdminFile::getBucketName, bucket);
        if (category != null && !category.isBlank()) query.eq(AdminFile::getCategory, category);
        if (status != null && !status.isBlank()) query.eq(AdminFile::getStatus, status);
        else query.eq(AdminFile::getStatus, "active"); // 默认只查active
        if (keyword != null && !keyword.isBlank()) query.like(AdminFile::getFileName, keyword);
        query.orderByDesc(AdminFile::getCreateTime);
        return fileMapper.selectPage(page, query);
    }

    @Override
    public Page<AdminFile> listRecycleBin(Integer pageNum, Integer pageSize) {
        Page<AdminFile> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminFile> query = new LambdaQueryWrapper<AdminFile>()
            .eq(AdminFile::getStatus, "recycled")
            .orderByDesc(AdminFile::getDeletedAt);
        return fileMapper.selectPage(page, query);
    }

    // ==================== 回收站操作 ====================

    @Override
    @Transactional
    public void recycleFile(Long id) {
        AdminFile file = fileMapper.selectById(id);
        if (file == null) throw new BusinessException(ResultCode.NOT_FOUND, "文件不存��");
        if (!"active".equals(file.getStatus())) throw new BusinessException(ResultCode.PARAM_ERROR, "仅活跃文件可移入回收站");
        file.setStatus("recycled");
        file.setDeletedAt(LocalDateTime.now());
        fileMapper.updateById(file);
    }

    @Override
    @Transactional
    public void restoreFile(Long id) {
        AdminFile file = fileMapper.selectById(id);
        if (file == null) throw new BusinessException(ResultCode.NOT_FOUND, "文件不存在");
        if (!"recycled".equals(file.getStatus())) throw new BusinessException(ResultCode.PARAM_ERROR, "仅回收站文件可恢复");
        file.setStatus("active");
        file.setDeletedAt(null);
        fileMapper.updateById(file);
    }

    @Override
    @Transactional
    public void deleteFilePermanently(Long id) {
        AdminFile file = fileMapper.selectById(id);
        if (file == null) throw new BusinessException(ResultCode.NOT_FOUND, "文件不存在");
        // 从 MinIO 删除
        removeFromMinio(file.getObjectName());
        // DB 标记删除
        file.setStatus("deleted");
        fileMapper.updateById(file);
    }

    @Override
    @Transactional
    public String emptyRecycleBin() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(recycleBinRetentionDays);
        List<AdminFile> files = fileMapper.selectList(
            new LambdaQueryWrapper<AdminFile>()
                .eq(AdminFile::getStatus, "recycled")
                .lt(AdminFile::getDeletedAt, cutoff)
        );
        int count = 0;
        for (AdminFile file : files) {
            try {
                removeFromMinio(file.getObjectName());
                file.setStatus("deleted");
                fileMapper.updateById(file);
                count++;
            } catch (Exception e) {
                log.error("彻底删除文件失败: {}", file.getObjectName(), e);
            }
        }
        return "清空回收站 " + count + " 个文件（" + recycleBinRetentionDays + " 天前）";
    }

    // ==================== 孤儿文件扫描 ====================

    @Override
    @Transactional
    public String scanOrphanFiles() {
        // 1. 获取所有 active 文件的 URL
        List<AdminFile> activeFiles = fileMapper.selectList(
            new LambdaQueryWrapper<AdminFile>().eq(AdminFile::getStatus, "active")
        );
        if (activeFiles.isEmpty()) return "无活跃文件，跳过扫描";

        // 2. 收集正在使用的 URL
        Set<String> usedUrls = new HashSet<>();

        // 用户头像
        List<AdminUser> users = userMapper.selectList(
            new LambdaQueryWrapper<AdminUser>().isNotNull(AdminUser::getAvatar).ne(AdminUser::getAvatar, "")
        );
        users.forEach(u -> usedUrls.add(u.getAvatar()));

        // TODO: 后续可扫描 admin_notice.content 中的图片链接、admin_system_config 的 logo/favicon

        // 3. 找出孤儿文件
        int orphanCount = 0;
        for (AdminFile file : activeFiles) {
            if (file.getUrl() != null && !usedUrls.contains(file.getUrl())) {
                file.setStatus("recycled");
                file.setDeletedAt(LocalDateTime.now());
                fileMapper.updateById(file);
                orphanCount++;
            }
        }

        return "扫描孤儿文件 " + orphanCount + " 个，已移入回收站（共检查 " + activeFiles.size() + " 个文件）";
    }

    // ==================== 桶列表 ====================

    @Override
    public List<String> listBuckets() {
        try {
            return minioClient.listBuckets().stream().map(Bucket::name).toList();
        } catch (Exception e) {
            log.error("列出桶失败", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "列出桶失败");
        }
    }

    // ==================== 内部方法 ====================

    private FileUploadVO doUpload(MultipartFile file, String directory, String category) {
        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = directory.endsWith("s") ? directory.substring(0, directory.length() - 1) : directory;
        String objectName = directory + "/" + datePath + "/" + prefix + "-" + UUID.randomUUID() + ext;

        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .stream(is, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build()
            );
        } catch (Exception e) {
            log.error("文件上传失败", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "文件上传失败");
        }

        String url = endpoint + "/" + bucketName + "/" + objectName;

        // 写入 DB
        AdminFile adminFile = new AdminFile();
        adminFile.setFileName(originalName);
        adminFile.setObjectName(objectName);
        adminFile.setBucketName(bucketName);
        adminFile.setUrl(url);
        adminFile.setSize(file.getSize());
        adminFile.setContentType(file.getContentType());
        adminFile.setCategory(category);
        adminFile.setStatus("active");
        AdminUserDetails currentUser = SecurityUtils.getCurrentUser();
        if (currentUser != null) {
            adminFile.setUploaderId(currentUser.getId());
            adminFile.setUploaderName(currentUser.getUsername());
        }
        fileMapper.insert(adminFile);

        FileUploadVO vo = new FileUploadVO();
        vo.setUrl(url);
        vo.setObjectName(objectName);
        vo.setFileName(originalName);
        vo.setSize(file.getSize());
        return vo;
    }

    private void removeFromMinio(String objectName) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder().bucket(bucketName).object(objectName).build()
            );
        } catch (Exception e) {
            log.error("MinIO 删除文件失败: {}", objectName, e);
        }
    }
}
