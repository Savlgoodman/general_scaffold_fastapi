package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "登录日志")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_login_log")
public class AdminLoginLog extends BaseEntity {

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "登录状态（success-成功 failed-失败 locked-锁定）")
    private String status;

    @Schema(description = "IP地址")
    private String ip;

    @Schema(description = "User-Agent")
    private String userAgent;

    @Schema(description = "登录消息")
    private String message;
}
