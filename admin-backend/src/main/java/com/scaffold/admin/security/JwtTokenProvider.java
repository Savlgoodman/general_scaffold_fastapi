package com.scaffold.admin.security;

import cn.hutool.core.util.StrUtil;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.scaffold.admin.common.RedisKeys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.concurrent.TimeUnit;

/**
 * JWT Token 提供者：签发、验证、刷新
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String USER_ID_KEY = "userId";
    private static final String TOKEN_TYPE_KEY = "tokenType";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-expiration}")
    private long accessExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private final RedisTemplate<String, Object> redisTemplate;

    private Algorithm algorithm;

    @PostConstruct
    public void init() {
        algorithm = Algorithm.HMAC256(secret);
    }

    /**
     * 生成 Access Token
     */
    public String generateAccessToken(Long userId, String username) {
        return generateToken(userId, username, ACCESS_TOKEN_TYPE, accessExpiration);
    }

    /**
     * 生成 Refresh Token
     */
    public String generateRefreshToken(Long userId, String username) {
        return generateToken(userId, username, REFRESH_TOKEN_TYPE, refreshExpiration);
    }

    /**
     * 生成 Token
     */
    private String generateToken(Long userId, String username, String tokenType, long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return JWT.create()
                .withClaim(USER_ID_KEY, userId)
                .withClaim("username", username)
                .withClaim(TOKEN_TYPE_KEY, tokenType)
                .withIssuedAt(now)
                .withExpiresAt(expiryDate)
                .sign(algorithm);
    }

    /**
     * 验证 Token
     */
    public DecodedJWT verifyToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            return verifier.verify(token);
        } catch (JWTVerificationException e) {
            log.warn("Token验证失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 从 Token 中获取用户ID
     */
    public Long getUserIdFromToken(String token) {
        DecodedJWT jwt = verifyToken(token);
        return jwt != null ? getUserIdFromJwt(jwt) : null;
    }

    /**
     * 从已解析的 JWT 中获取用户ID
     */
    public Long getUserIdFromJwt(DecodedJWT jwt) {
        return jwt.getClaim(USER_ID_KEY).asLong();
    }

    /**
     * 从 Token 中获取用户名
     */
    public String getUsernameFromToken(String token) {
        DecodedJWT jwt = verifyToken(token);
        return jwt != null ? jwt.getClaim("username").asString() : null;
    }

    /**
     * 从已解析的 JWT 中判断是否为 Access Token
     */
    public boolean isAccessToken(DecodedJWT jwt) {
        return ACCESS_TOKEN_TYPE.equals(jwt.getClaim(TOKEN_TYPE_KEY).asString());
    }

    /**
     * 判断 Token 字符串是否为 Access Token
     */
    public boolean isAccessToken(String token) {
        DecodedJWT jwt = verifyToken(token);
        return jwt != null && isAccessToken(jwt);
    }

    /**
     * 从已解析的 JWT 中判断是否为 Refresh Token
     */
    public boolean isRefreshToken(DecodedJWT jwt) {
        return REFRESH_TOKEN_TYPE.equals(jwt.getClaim(TOKEN_TYPE_KEY).asString());
    }

    /**
     * 判断 Token 字符串是否为 Refresh Token
     */
    public boolean isRefreshToken(String token) {
        DecodedJWT jwt = verifyToken(token);
        return jwt != null && isRefreshToken(jwt);
    }

    /**
     * 将 Token 加入黑名单
     */
    public void addToBlacklist(String token) {
        if (StrUtil.isBlank(token)) {
            return;
        }
        DecodedJWT jwt = verifyToken(token);
        if (jwt == null) {
            return;
        }
        // 计算剩余过期时间，黑名单key的TTL设置为token的剩余有效期
        long remainingTime = jwt.getExpiresAt().getTime() - System.currentTimeMillis();
        if (remainingTime > 0) {
            String key = RedisKeys.TOKEN_BLACKLIST.key(token);
            redisTemplate.opsForValue().set(key, "1", remainingTime, TimeUnit.MILLISECONDS);
            log.debug("Token已加入黑名单: {}", key);
        }
    }

    /**
     * 检查 Token 是否在黑名单中
     */
    public boolean isInBlacklist(String token) {
        if (StrUtil.isBlank(token)) {
            return false;
        }
        String key = RedisKeys.TOKEN_BLACKLIST.key(token);
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * 获取 Access Token 的剩余有效期（秒）
     */
    public long getAccessTokenExpiration() {
        return accessExpiration / 1000;
    }

    /**
     * 获取 Refresh Token 的剩余有效期（秒）
     */
    public long getRefreshTokenExpiration() {
        return refreshExpiration / 1000;
    }
}
