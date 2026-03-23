package com.scaffold.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.RedisKeys;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminLoginLogMapper;
import com.scaffold.admin.mapper.AdminUserMapper;
import com.scaffold.admin.model.dto.LoginDTO;
import com.scaffold.admin.model.dto.RefreshTokenDTO;
import com.scaffold.admin.model.dto.RegisterDTO;
import com.scaffold.admin.model.entity.AdminLoginLog;
import com.scaffold.admin.model.entity.AdminUser;
import com.scaffold.admin.model.vo.CaptchaVO;
import com.scaffold.admin.model.vo.LoginVO;
import com.scaffold.admin.model.vo.MenuVO;
import com.scaffold.admin.model.vo.UserVO;
import com.scaffold.admin.security.JwtTokenProvider;
import com.scaffold.admin.service.AuthService;
import com.scaffold.admin.service.MenuService;
import com.scaffold.admin.util.AuthCaptchaUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 认证服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int MAX_LOGIN_FAIL_COUNT = 5;
    private static final long LOCK_DURATION = 15; // 锁定15分钟

    private final AdminUserMapper adminUserMapper;
    private final AdminLoginLogMapper loginLogMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;
    private final HttpServletRequest httpServletRequest;
    private final MenuService menuService;

    @Override
    public CaptchaVO generateCaptcha() {
        AuthCaptchaUtil.CaptchaResult result = AuthCaptchaUtil.generate(redisTemplate);
        CaptchaVO vo = new CaptchaVO();
        vo.setCaptchaKey(result.getCaptchaKey());
        vo.setCaptchaImage(result.getCaptchaImage());
        vo.setType(result.getType());
        return vo;
    }

    @Override
    @Transactional
    public LoginVO login(LoginDTO loginDTO) {
        String username = loginDTO.getUsername();
        String ip = getClientIp();
        String userAgent = httpServletRequest.getHeader("User-Agent");

        // 检查账户是否被锁定
        checkAccountLocked(username);

        // 验证图形验证码
        if (!AuthCaptchaUtil.verify(loginDTO.getCaptchaKey(), loginDTO.getCaptchaCode(), redisTemplate)) {
            recordLoginLog(username, "failed", ip, userAgent, "验证码错误");
            incrementLoginFailCount(username);
            throw new BusinessException(ResultCode.PARAM_ERROR, "验证码错误");
        }

        try {
            // 1. 先查询用户
            AdminUser user = adminUserMapper.selectOne(
                    new LambdaQueryWrapper<AdminUser>()
                            .eq(AdminUser::getUsername, username)
                            .eq(AdminUser::getIsDeleted, 0)
            );

            // 2. 检查用户是否存在
            if (user == null) {
                recordLoginLog(username, "failed", ip, userAgent, "用户不存在");
                incrementLoginFailCount(username);
                throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
            }

            // 3. 检查用户是否被禁用
            if (user.getStatus() == null || user.getStatus() != 1) {
                recordLoginLog(username, "disabled", ip, userAgent, "账户已被禁用");
                throw new BusinessException(ResultCode.ACCOUNT_LOCKED, "账户已被禁用");
            }

            // 4. 验证密码
            if (!passwordEncoder.matches(loginDTO.getPassword(), user.getPassword())) {
                recordLoginLog(username, "failed", ip, userAgent, "密码错误");
                incrementLoginFailCount(username);
                throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
            }

            // 5. 创建认证信息
            AdminUserServiceImpl.AdminUserDetails userDetails = new AdminUserServiceImpl.AdminUserDetails(user, Collections.emptyList());
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // 清除登录失败计数
            clearLoginFailCount(username);

            // 生成Token
            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getUsername());
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getUsername());

            // 存储Refresh Token用于精确注销
            storeRefreshToken(user.getId(), refreshToken);

            // 记录登录日志
            recordLoginLog(username, "success", ip, userAgent, "登录成功");

            // 构建响应
            return buildLoginVO(user, accessToken, refreshToken);
        } catch (BusinessException e) {
            throw e; // 已经是业务异常，直接抛出
        } catch (Exception e) {
            recordLoginLog(username, "failed", ip, userAgent, "系统异常");
            log.error("登录异常", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "登录失败");
        }
    }

    @Override
    @Transactional
    public LoginVO register(RegisterDTO registerDTO) {
        // 检查用户名是否已存在
        AdminUser existUser = adminUserMapper.selectOne(
                new LambdaQueryWrapper<AdminUser>()
                        .eq(AdminUser::getUsername, registerDTO.getUsername())
                        .eq(AdminUser::getIsDeleted, 0)
        );
        if (existUser != null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名已存在");
        }

        // 创建新用户
        AdminUser user = new AdminUser();
        user.setUsername(registerDTO.getUsername());
        user.setPassword(passwordEncoder.encode(registerDTO.getPassword()));
        user.setNickname(registerDTO.getNickname());
        user.setEmail(registerDTO.getEmail());
        user.setPhone(registerDTO.getPhone());
        user.setStatus(1); // 默认启用

        adminUserMapper.insert(user);

        // 生成Token
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getUsername());

        // 存储Refresh Token用于精确注销
        storeRefreshToken(user.getId(), refreshToken);

        // 记录登录日志
        String ip = getClientIp();
        String userAgent = httpServletRequest.getHeader("User-Agent");
        recordLoginLog(user.getUsername(), "success", ip, userAgent, "注册成功");

        return buildLoginVO(user, accessToken, refreshToken);
    }

    @Override
    public LoginVO refreshToken(RefreshTokenDTO refreshTokenDTO) {
        String refreshToken = refreshTokenDTO.getRefreshToken();

        // 一次性验证 Refresh Token
        DecodedJWT jwt = jwtTokenProvider.verifyToken(refreshToken);
        if (jwt == null || !jwtTokenProvider.isRefreshToken(jwt)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "无效的Refresh Token");
        }

        // 检查是否在黑名单
        if (jwtTokenProvider.isInBlacklist(refreshToken)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Refresh Token已失效");
        }

        Long userId = jwtTokenProvider.getUserIdFromJwt(jwt);
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "无效的Refresh Token");
        }

        // 检查是否是当前有效的Refresh Token（防止被盗用）
        String storedRefreshToken = getStoredRefreshToken(userId);
        if (storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Refresh Token已失效");
        }

        // 获取用户信息
        AdminUser user = adminUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }

        // 检查用户状态
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new BusinessException(ResultCode.ACCOUNT_LOCKED, "账户已被禁用");
        }

        // 将旧的Refresh Token加入黑名单
        jwtTokenProvider.addToBlacklist(refreshToken);

        // 生成新Token
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getUsername());

        // 存储新的Refresh Token
        storeRefreshToken(user.getId(), newRefreshToken);

        return buildLoginVO(user, newAccessToken, newRefreshToken);
    }

    @Override
    public void logout(String accessToken) {
        if (StrUtil.isNotBlank(accessToken) && accessToken.startsWith("Bearer ")) {
            accessToken = accessToken.substring(7);
        }
        if (StrUtil.isNotBlank(accessToken)) {
            // 将Access Token加入黑名单
            jwtTokenProvider.addToBlacklist(accessToken);

            // 从Access Token中获取userId，注销对应的Refresh Token
            Long userId = jwtTokenProvider.getUserIdFromToken(accessToken);
            if (userId != null) {
                String storedRefreshToken = getStoredRefreshToken(userId);
                if (storedRefreshToken != null) {
                    jwtTokenProvider.addToBlacklist(storedRefreshToken);
                    deleteStoredRefreshToken(userId);
                }
            }

            log.debug("用户登出，Token已加入黑名单");
        }
    }

    /**
     * 检查账户是否被锁定
     */
    private void checkAccountLocked(String username) {
        String key = RedisKeys.LOGIN_FAIL.key(username);
        Object failCount = redisTemplate.opsForValue().get(key);
        if (failCount != null) {
            int count = Integer.parseInt(failCount.toString());
            if (count >= MAX_LOGIN_FAIL_COUNT) {
                throw new BusinessException(ResultCode.ACCOUNT_LOCKED,
                        "登录失败次数过多，账户已被锁定" + LOCK_DURATION + "分钟");
            }
        }
    }

    /**
     * 增加登录失败计数
     */
    private void incrementLoginFailCount(String username) {
        String key = RedisKeys.LOGIN_FAIL.key(username);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            // 首次失败，设置过期时间
            redisTemplate.expire(key, LOCK_DURATION, TimeUnit.MINUTES);
        }
        log.debug("用户 {} 登录失败次数: {}", username, count);
    }

    /**
     * 清除登录失败计数
     */
    private void clearLoginFailCount(String username) {
        String key = RedisKeys.LOGIN_FAIL.key(username);
        redisTemplate.delete(key);
    }

    /**
     * 存储用户的Refresh Token（用于精确注销）
     */
    private void storeRefreshToken(Long userId, String refreshToken) {
        String key = RedisKeys.USER_REFRESH_TOKEN.key(userId.toString());
        // Refresh Token有效期为7天
        redisTemplate.opsForValue().set(key, refreshToken, refreshExpiration(), TimeUnit.MILLISECONDS);
    }

    /**
     * 获取用户当前存储的Refresh Token
     */
    private String getStoredRefreshToken(Long userId) {
        String key = RedisKeys.USER_REFRESH_TOKEN.key(userId.toString());
        return (String) redisTemplate.opsForValue().get(key);
    }

    /**
     * 删除用户存储的Refresh Token
     */
    private void deleteStoredRefreshToken(Long userId) {
        String key = RedisKeys.USER_REFRESH_TOKEN.key(userId.toString());
        redisTemplate.delete(key);
    }

    /**
     * 获取Refresh Token有效期（毫秒）
     */
    private long refreshExpiration() {
        return jwtTokenProvider.getRefreshTokenExpiration() * 1000;
    }

    /**
     * 记录登录日志
     */
    private void recordLoginLog(String username, String status, String ip, String userAgent, String message) {
        try {
            AdminLoginLog loginLog = new AdminLoginLog();
            loginLog.setUsername(username);
            loginLog.setStatus(status);
            loginLog.setIp(ip);
            loginLog.setUserAgent(userAgent);
            loginLog.setMessage(message);
            loginLogMapper.insert(loginLog);
        } catch (Exception e) {
            log.error("记录登录日志失败", e);
        }
    }

    /**
     * 获取客户端IP
     */
    private String getClientIp() {
        String ip = httpServletRequest.getHeader("X-Forwarded-For");
        if (StrUtil.isBlank(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = httpServletRequest.getHeader("Proxy-Client-IP");
        }
        if (StrUtil.isBlank(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = httpServletRequest.getHeader("WL-Proxy-Client-IP");
        }
        if (StrUtil.isBlank(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = httpServletRequest.getRemoteAddr();
        }
        // 多级代理时取第一个IP
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * 构建登录响应
     */
    private LoginVO buildLoginVO(AdminUser user, String accessToken, String refreshToken) {
        LoginVO vo = new LoginVO();
        vo.setAccessToken(accessToken);
        vo.setRefreshToken(refreshToken);
        vo.setTokenType("Bearer");
        vo.setExpiresIn(jwtTokenProvider.getAccessTokenExpiration());

        UserVO userVO = new UserVO();
        BeanUtils.copyProperties(user, userVO);
        vo.setUser(userVO);

        // 查询用户可见菜单树
        List<MenuVO> menus;
        if (user.getIsSuperuser() != null && user.getIsSuperuser() == 1) {
            menus = menuService.getMenuTree();
        } else {
            menus = menuService.getUserMenuTree(user.getId());
        }
        vo.setMenus(menus);

        return vo;
    }
}
