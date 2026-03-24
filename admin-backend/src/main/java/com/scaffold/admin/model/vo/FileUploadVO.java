package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "文件上传响应")
@Data
public class FileUploadVO {

    @Schema(description = "文件访问URL")
    private String url;

    @Schema(description = "对象名（用于删除）")
    private String objectName;

    @Schema(description = "原始文件名")
    private String fileName;

    @Schema(description = "文件大小（字节）")
    private Long size;
}
