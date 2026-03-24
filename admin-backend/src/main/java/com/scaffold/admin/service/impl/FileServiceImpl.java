package com.scaffold.admin.service.impl;

import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.vo.BucketFileVO;
import com.scaffold.admin.model.vo.FileUploadVO;
import com.scaffold.admin.service.FileService;
import io.minio.*;
import io.minio.messages.Bucket;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private static final long MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final Set<String> AVATAR_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    private final MinioClient minioClient;

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Override
    public FileUploadVO uploadFile(MultipartFile file, String directory) {
        if (file.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "文件大小不能超过50MB");
        }
        return doUpload(file, directory != null ? directory : "files");
    }

    @Override
    public FileUploadVO uploadAvatar(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "文件不能为空");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "头像大小不能超过2MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !AVATAR_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "头像仅支持 jpg/png/gif/webp 格式");
        }
        return doUpload(file, "avatars");
    }

    @Override
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build()
            );
        } catch (Exception e) {
            log.error("删除文件失败: {}", objectName, e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "删除文件失败");
        }
    }

    @Override
    public List<BucketFileVO> listFiles(String prefix) {
        List<BucketFileVO> list = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                    .bucket(bucketName)
                    .prefix(prefix != null ? prefix : "")
                    .recursive(true)
                    .build()
            );
            for (Result<Item> result : results) {
                Item item = result.get();
                if (item.isDir()) continue;
                BucketFileVO vo = new BucketFileVO();
                vo.setObjectName(item.objectName());
                String[] parts = item.objectName().split("/");
                vo.setFileName(parts[parts.length - 1]);
                vo.setSize(item.size());
                if (item.lastModified() != null) {
                    vo.setLastModified(LocalDateTime.ofInstant(
                        item.lastModified().toInstant(), ZoneId.systemDefault()));
                }
                list.add(vo);
            }
        } catch (Exception e) {
            log.error("列出文件失败", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "列出文件失败");
        }
        return list;
    }

    @Override
    public List<String> listBuckets() {
        try {
            return minioClient.listBuckets().stream()
                .map(Bucket::name)
                .toList();
        } catch (Exception e) {
            log.error("列出桶失败", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "列出桶失败");
        }
    }

    private FileUploadVO doUpload(MultipartFile file, String directory) {
        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String objectName = directory + "/" + datePath + "/" + UUID.randomUUID() + ext;

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

        FileUploadVO vo = new FileUploadVO();
        vo.setUrl(endpoint + "/" + bucketName + "/" + objectName);
        vo.setObjectName(objectName);
        vo.setFileName(originalName);
        vo.setSize(file.getSize());
        return vo;
    }
}
