package com.scaffold.admin.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scaffold.admin.common.R;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.entity.AdminUser;
import com.scaffold.admin.service.RBACService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl.AdminUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * 权限授权过滤器：检查用户是否有访问特定API的权限
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PermissionAuthorizationFilter extends OncePerRequestFilter {

    private static final Set<String> EXCLUDE_PATHS = Set.of(
        "/health",
        "/api/admin/auth/login",
        "/api/admin/auth/captcha",
        "/api/admin/auth/**",
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/api-docs",
        "/v3/api-docs/**",
        "/webjars/**",
        "/openapi.json",
        "/error"
    );

    private final RBACService rbacService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // 检查是否需要权限检查
        if (shouldSkipAuth(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 获取当前认证信息
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            sendUnauthorizedResponse(response, "未登录");
            return;
        }

        // 获取用户ID
        Long userId = extractUserId(authentication);
        if (userId == null) {
            sendUnauthorizedResponse(response, "无法获取用户信息");
            return;
        }

        // 检查权限
        boolean hasPermission = rbacService.checkPermission(userId, path, method);
        if (!hasPermission) {
            log.debug("用户 {} 无权访问 {} {}", userId, method, path);
            sendForbiddenResponse(response, "无权访问该接口");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldSkipAuth(String path) {
        return EXCLUDE_PATHS.stream().anyMatch(path::startsWith);
    }

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        // 直接是 AdminUserDetails 类型
        if (principal instanceof AdminUserDetails userDetails) {
            return userDetails.getId();
        }

        // AdminUser 类型
        if (principal instanceof AdminUser user) {
            return user.getId();
        }

        // 如果是 Map 类型
        if (principal instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) principal;
            Object userId = map.get("id");
            if (userId instanceof Long) {
                return (Long) userId;
            } else if (userId instanceof Integer) {
                return ((Integer) userId).longValue();
            }
        }

        return null;
    }

    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        R<?> errorResponse = R.error(ResultCode.UNAUTHORIZED, message);
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }

    private void sendForbiddenResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        R<?> errorResponse = R.error(ResultCode.FORBIDDEN, message);
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
