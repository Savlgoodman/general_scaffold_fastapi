package com.scaffold.admin.util;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * MinIO 工具类：presigned URL 签发等公共操作
 */
@Slf4j
@Component
public class MinioUtils {

    private static final int DEFAULT_EXPIRY_SECONDS = 300; // 5 分钟

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioUtils(MinioClient minioClient, @Value("${minio.bucket-name}") String bucketName) {
        this.minioClient = minioClient;
        this.bucketName = bucketName;
    }

    /**
     * 生成 presigned URL（默认 5 分钟有效）
     */
    public String getPresignedUrl(String objectName) {
        return getPresignedUrl(objectName, DEFAULT_EXPIRY_SECONDS);
    }

    /**
     * 生成 presigned URL（自定义有效期，单位秒）
     */
    public String getPresignedUrl(String objectName, int expirySeconds) {
        try {
            return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(expirySeconds)
                    .build()
            );
        } catch (Exception e) {
            log.error("生成 presigned URL 失败: {}", objectName, e);
            return null;
        }
    }

    /**
     * 判断是否为公开读目录（avatars/ 和 config/ 公开，不需要 presigned）
     */
    public boolean isPublicPath(String objectName) {
        return objectName != null && (objectName.startsWith("avatars/") || objectName.startsWith("config/"));
    }
}
