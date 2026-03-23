package com.scaffold.admin.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scaffold.admin.common.R;
import com.scaffold.admin.model.entity.AdminApiLog;
import com.scaffold.admin.service.LogWriteService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl.AdminUserDetails;
import com.scaffold.admin.util.IpUtils;
import com.scaffold.admin.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.annotation.Annotation;
import java.util.Set;

/**
 * API 请求日志切面
 * 拦截所有 Controller 方法，异步记录请求/响应信息到 admin_api_log
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class ApiLogAspect {

    private static final int MAX_BODY_LENGTH = 2000;

    private static final Set<String> EXCLUDE_PREFIXES = Set.of(
        "/api/admin/auth/",
        "/swagger-ui",
        "/api-docs",
        "/v3/api-docs",
        "/health"
    );

    private final LogWriteService logWriteService;
    private final ObjectMapper objectMapper;

    @Around("within(@org.springframework.web.bind.annotation.RestController *)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        HttpServletRequest request = getCurrentRequest();
        if (request == null || shouldSkip(request.getRequestURI())) {
            return joinPoint.proceed();
        }

        long startTime = System.currentTimeMillis();
        Object result = null;
        try {
            result = joinPoint.proceed();
            return result;
        } finally {
            try {
                long duration = System.currentTimeMillis() - startTime;
                int status = result instanceof R<?> r ? r.getCode() : 0;
                log.info("[API] {} {} {} {}ms", request.getMethod(), request.getRequestURI(), status, duration);
                recordApiLog(request, joinPoint, result, duration);
            } catch (Exception e) {
                log.error("记录API日志异常", e);
            }
        }
    }

    private void recordApiLog(HttpServletRequest request, ProceedingJoinPoint joinPoint,
                              Object result, long duration) {
        AdminApiLog apiLog = new AdminApiLog();

        // 用户信息
        AdminUserDetails user = SecurityUtils.getCurrentUser();
        if (user != null) {
            apiLog.setUserId(user.getId());
            apiLog.setUsername(user.getUsername());
        }

        // 请求信息
        apiLog.setMethod(request.getMethod());
        apiLog.setPath(request.getRequestURI());
        apiLog.setQueryParams(request.getQueryString());
        apiLog.setIp(IpUtils.getClientIp(request));
        apiLog.setUserAgent(request.getHeader("User-Agent"));
        apiLog.setDurationMs(duration);

        // 请求体（从 @RequestBody 参数提取）
        apiLog.setRequestBody(extractRequestBody(joinPoint));

        // 响应信息
        if (result instanceof R<?> r) {
            apiLog.setResponseCode(r.getCode());
            apiLog.setResponseBody(truncate(toJson(result)));
        }

        logWriteService.writeApiLog(apiLog);
    }

    private String extractRequestBody(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Annotation[][] paramAnnotations = signature.getMethod().getParameterAnnotations();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < paramAnnotations.length; i++) {
            for (Annotation annotation : paramAnnotations[i]) {
                if (annotation instanceof RequestBody && i < args.length && args[i] != null) {
                    return truncate(toJson(args[i]));
                }
            }
        }
        return null;
    }

    private boolean shouldSkip(String path) {
        for (String prefix : EXCLUDE_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return obj.toString();
        }
    }

    private String truncate(String str) {
        if (str == null) return null;
        return str.length() > MAX_BODY_LENGTH ? str.substring(0, MAX_BODY_LENGTH) : str;
    }

    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest() : null;
    }
}
