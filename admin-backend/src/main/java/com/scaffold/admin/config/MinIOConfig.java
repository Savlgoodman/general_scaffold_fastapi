package com.scaffold.admin.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class MinIOConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Bean
    public MinioClient minioClient() {
        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();

        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("MinIO 默认桶 '{}' 创建成功", bucketName);
            }
            // avatars/ 和 config/ 目录公开读（需要长期有效 URL），其他目录私有用 presigned URL
            String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": [
                        "arn:aws:s3:::%s/avatars/*",
                        "arn:aws:s3:::%s/config/*"
                      ]
                    }
                  ]
                }
                """.formatted(bucketName, bucketName);
            client.setBucketPolicy(
                SetBucketPolicyArgs.builder()
                    .bucket(bucketName)
                    .config(policy)
                    .build()
            );
        } catch (Exception e) {
            log.warn("MinIO 初始化失败: {}", e.getMessage());
        }

        return client;
    }
}
