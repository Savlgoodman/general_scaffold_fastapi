package com.scaffold.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.model.entity.AdminFile;
import com.scaffold.admin.model.vo.FileUploadVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileService {

    /** 通用文件上传（同时写入 DB） */
    FileUploadVO uploadFile(MultipartFile file, String category);

    /** 头像上传（限图片 ≤2MB，category=avatar） */
    FileUploadVO uploadAvatar(MultipartFile file);

    /** 分页查询文���记录 */
    Page<AdminFile> listFiles(Integer pageNum, Integer pageSize, String bucket, String category, String status, String keyword);

    /** 移入回收站 */
    void recycleFile(Long id);

    /** 从回收站恢复 */
    void restoreFile(Long id);

    /** 彻底删除（DB + MinIO） */
    void deleteFilePermanently(Long id);

    /** 回收站文件列表 */
    Page<AdminFile> listRecycleBin(Integer pageNum, Integer pageSize);

    /** 清空回收站（定时任务调用，返回结果描述） */
    String emptyRecycleBin();

    /** 孤儿文件扫描（定时任务调用，返回结果描述） */
    String scanOrphanFiles();

    /** 列出所有桶 */
    List<String> listBuckets();
}
