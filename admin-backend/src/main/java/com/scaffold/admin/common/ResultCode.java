package com.scaffold.admin.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Schema(description = "响应状态码枚举")
@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(200, "OK"),
    PARAM_ERROR(400, "参数错误"),
    UNAUTHORIZED(401, "未认证"),
    FORBIDDEN(403, "无权限"),
    NOT_FOUND(404, "资源不存在"),
    ACCOUNT_LOCKED(423, "账户已被锁定"),
    INTERNAL_SERVER_ERROR(500, "服务器内部错误");

    @Schema(description = "状态码")
    private final int code;

    @Schema(description = "状态消息")
    private final String message;
}
