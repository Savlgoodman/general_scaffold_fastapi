package com.scaffold.admin.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Redis 在线会话数据（存储在 online:session:{userId}）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnlineSessionData {

    private Long userId;
    private String username;
    private String nickname;
    private String loginIp;
    private String userAgent;
    private LocalDateTime loginTime;
    private LocalDateTime lastActiveTime;
    private String accessToken;
}
