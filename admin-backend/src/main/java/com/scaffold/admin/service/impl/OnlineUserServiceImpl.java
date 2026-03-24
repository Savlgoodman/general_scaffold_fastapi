package com.scaffold.admin.service.impl;

import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.RedisKeys;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.model.vo.OnlineSessionData;
import com.scaffold.admin.model.vo.OnlineUserVO;
import com.scaffold.admin.security.JwtTokenProvider;
import com.scaffold.admin.service.OnlineUserService;
import com.scaffold.admin.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * 在线用户服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnlineUserServiceImpl implements OnlineUserService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public List<OnlineUserVO> listOnlineUsers() {
        String pattern = RedisKeys.ONLINE_SESSION.key("*");
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys == null || keys.isEmpty()) {
            return List.of();
        }

        List<OnlineUserVO> result = new ArrayList<>();
        for (String key : keys) {
            Object value = redisTemplate.opsForValue().get(key);
            if (value instanceof OnlineSessionData session) {
                OnlineUserVO vo = new OnlineUserVO();
                BeanUtils.copyProperties(session, vo);
                result.add(vo);
            }
        }

        // 按登录时间降序排列
        result.sort(Comparator.comparing(OnlineUserVO::getLoginTime,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    @Override
    @OperationLog(module = "在线用户管理", type = OperationType.DELETE, description = "强制用户下线")
    public void forceOffline(Long userId) {
        // 不能踢自己
        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(userId)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能强制自己下线");
        }

        // 读取在线会话
        String sessionKey = RedisKeys.ONLINE_SESSION.key(userId.toString());
        Object value = redisTemplate.opsForValue().get(sessionKey);
        if (!(value instanceof OnlineSessionData session)) {
            throw new BusinessException(ResultCode.NOT_FOUND, "该用户不在线");
        }

        // 拉黑 Access Token
        jwtTokenProvider.addToBlacklist(session.getAccessToken());

        // 拉黑 Refresh Token
        String refreshTokenKey = RedisKeys.USER_REFRESH_TOKEN.key(userId.toString());
        Object storedRefreshToken = redisTemplate.opsForValue().get(refreshTokenKey);
        if (storedRefreshToken != null) {
            jwtTokenProvider.addToBlacklist(storedRefreshToken.toString());
            redisTemplate.delete(refreshTokenKey);
        }

        // 删除在线会话
        redisTemplate.delete(sessionKey);

        log.info("管理员[{}]强制用户[{}]下线", currentUserId, userId);
    }
}
