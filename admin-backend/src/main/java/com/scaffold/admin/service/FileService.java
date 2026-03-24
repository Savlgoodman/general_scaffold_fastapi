package com.scaffold.admin.service;

import com.scaffold.admin.model.vo.BucketFileVO;
import com.scaffold.admin.model.vo.FileUploadVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileService {

    /**
     * 通用文件上传
     */
    FileUploadVO uploadFile(MultipartFile file, String directory);

    /**
     * 头像上传（限图片类型，≤2MB）
     */
    FileUploadVO uploadAvatar(MultipartFile file);

    /**
     * 删除文件
     */
    void deleteFile(String objectName);

    /**
     * 分页列出文件
     */
    List<BucketFileVO> listFiles(String prefix);

    /**
     * 列出所有桶
     */
    List<String> listBuckets();
}
