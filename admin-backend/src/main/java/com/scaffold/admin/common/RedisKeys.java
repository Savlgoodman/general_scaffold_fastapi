package com.scaffold.admin.common;

/**
 * Redis Key 枚举
 */
public enum RedisKeys {

    CAPTCHA("captcha", "验证码"),
    TOKEN_BLACKLIST("token:blacklist", "Token黑名单"),
    LOGIN_FAIL("login:fail", "登录失败计数"),
    USER_REFRESH_TOKEN("user:refresh_token", "用户当前有效的Refresh Token");

    private final String prefix;
    private final String description;

    RedisKeys(String prefix, String description) {
        this.prefix = prefix;
        this.description = description;
    }

    public String getPrefix() {
        return prefix;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 构建完整的Key
     */
    public String key(String... suffixes) {
        if (suffixes == null || suffixes.length == 0) {
            return prefix;
        }
        return prefix + ":" + String.join(":", suffixes);
    }
}
