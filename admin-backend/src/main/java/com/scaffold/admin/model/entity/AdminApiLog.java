package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "API请求日志")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_api_log")
public class AdminApiLog extends BaseEntity {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "请求方法")
    private String method;

    @Schema(description = "请求路径")
    private String path;

    @Schema(description = "查询参数")
    private String queryParams;

    @Schema(description = "请求体")
    private String requestBody;

    @Schema(description = "响应码")
    private Integer responseCode;

    @Schema(description = "响应体")
    private String responseBody;

    @Schema(description = "耗时毫秒")
    private Long durationMs;

    @Schema(description = "IP地址")
    private String ip;

    @Schema(description = "User-Agent")
    private String userAgent;

    @Schema(description = "API名称（关联权限表）")
    @TableField(exist = false)
    private String apiName;
}
