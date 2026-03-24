package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "桶文件信息")
@Data
public class BucketFileVO {

    @Schema(description = "对象路径")
    private String objectName;

    @Schema(description = "文件名")
    private String fileName;

    @Schema(description = "文件大小（字节）")
    private Long size;

    @Schema(description = "MIME类型")
    private String contentType;

    @Schema(description = "最后修改时间")
    private LocalDateTime lastModified;
}
