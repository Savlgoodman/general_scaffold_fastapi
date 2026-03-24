package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 在线用户信息 VO（不包含 accessToken）
 */
@Data
@Schema(description = "在线用户信息")
public class OnlineUserVO {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "登录IP")
    private String loginIp;

    @Schema(description = "User-Agent")
    private String userAgent;

    @Schema(description = "登录时��")
    private LocalDateTime loginTime;

    @Schema(description = "最后活跃时间")
    private LocalDateTime lastActiveTime;
}
