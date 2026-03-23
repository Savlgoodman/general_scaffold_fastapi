package com.scaffold.admin.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.model.entity.AdminOperationLog;
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
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 操作审计日志切面
 * 拦截标注了 @OperationLog 的 Service 方法，异步记录操作信息
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OperationLogAspect {

    private static final int MAX_DATA_LENGTH = 2000;

    private final LogWriteService logWriteService;
    private final ObjectMapper objectMapper;

    @Around("@annotation(operationLog)")
    public Object around(ProceedingJoinPoint joinPoint, OperationLog operationLog) throws Throwable {
        Object result = joinPoint.proceed();

        try {
            recordOperationLog(joinPoint, operationLog, result);
        } catch (Exception e) {
            log.error("记录操作审计日志异常", e);
        }

        return result;
    }

    private void recordOperationLog(ProceedingJoinPoint joinPoint, OperationLog annotation, Object result) {
        AdminOperationLog opLog = new AdminOperationLog();

        // 用户信息
        AdminUserDetails user = SecurityUtils.getCurrentUser();
        if (user != null) {
            opLog.setUserId(user.getId());
            opLog.setUsername(user.getUsername());
        }

        // 操作信息
        opLog.setModule(annotation.module());
        opLog.setOperation(annotation.type().name());

        // 方法信息
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        opLog.setMethodName(className + "." + methodName);

        // 请求参数
        opLog.setRequestParams(truncate(toJson(joinPoint.getArgs())));

        // 返回值作为 newData
        if (result != null) {
            opLog.setNewData(truncate(toJson(result)));
        }

        // IP
        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            opLog.setIp(IpUtils.getClientIp(request));
        }

        logWriteService.writeOperationLog(opLog);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return obj != null ? obj.toString() : null;
        }
    }

    private String truncate(String str) {
        if (str == null) return null;
        return str.length() > MAX_DATA_LENGTH ? str.substring(0, MAX_DATA_LENGTH) : str;
    }

    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest() : null;
    }
}
