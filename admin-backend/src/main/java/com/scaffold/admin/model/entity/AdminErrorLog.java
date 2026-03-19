package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "系统异常日志")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_error_log")
public class AdminErrorLog extends BaseEntity {

    @Schema(description = "异常级别（WARNING ERROR CRITICAL）")
    private String level;

    @Schema(description = "异常类名")
    private String exceptionClass;

    @Schema(description = "异常消息")
    private String exceptionMessage;

    @Schema(description = "堆栈信息")
    private String stackTrace;

    @Schema(description = "请求路径")
    private String requestPath;

    @Schema(description = "请求方法")
    private String requestMethod;

    @Schema(description = "请求参数")
    private String requestParams;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "IP地址")
    private String ip;
}
