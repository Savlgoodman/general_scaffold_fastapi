package com.scaffold.admin.handler;

import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.common.R;
import com.scaffold.admin.model.entity.AdminErrorLog;
import com.scaffold.admin.service.LogWriteService;
import com.scaffold.admin.util.IpUtils;
import com.scaffold.admin.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final int MAX_STACK_TRACE_LENGTH = 4000;
    private static final int MAX_MESSAGE_LENGTH = 500;

    private final LogWriteService logWriteService;
    private final HttpServletRequest request;

    @ExceptionHandler(BusinessException.class)
    public R<Void> handleBusinessException(BusinessException e) {
        log.warn("业务异常: code={}, message={}", e.getCode(), e.getMessage());
        return R.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public R<Void> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        log.warn("参数校验异常: {}", message);
        return R.error(ResultCode.PARAM_ERROR, message);
    }

    @ExceptionHandler(BindException.class)
    public R<Void> handleBindException(BindException e) {
        String message = e.getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        log.warn("参数绑定异常: {}", message);
        return R.error(ResultCode.PARAM_ERROR, message);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public R<Void> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("缺少必填参数: {}", e.getParameterName());
        return R.error(ResultCode.PARAM_ERROR, "缺少必填参数: " + e.getParameterName());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public R<Void> handleHttpMessageNotReadable(HttpMessageNotReadableException e) {
        log.warn("请求体解析失败: {}", e.getMessage());
        return R.error(ResultCode.PARAM_ERROR, "请求体格式错误");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public R<Void> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.warn("不支持的请求方法: {}", e.getMethod());
        return R.error(405, "不支持的请求方法: " + e.getMethod());
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public R<Void> handleNoHandlerFound(NoHandlerFoundException e) {
        return R.error(ResultCode.NOT_FOUND, "接口不存在");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public R<Void> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("非法参数: {}", e.getMessage());
        return R.error(ResultCode.PARAM_ERROR, "参数错误");
    }

    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        log.error("系统异常", e);
        writeErrorLog(e, determineLevel(e));
        return R.error(ResultCode.INTERNAL_SERVER_ERROR, "系统内部错误，请稍后重试");
    }

    // ==================== 异常日志入库 ====================

    private String determineLevel(Exception e) {
        if (e instanceof OutOfMemoryError || e instanceof StackOverflowError) {
            return "CRITICAL";
        }
        return "ERROR";
    }

    private void writeErrorLog(Exception e, String level) {
        try {
            AdminErrorLog errorLog = new AdminErrorLog();
            errorLog.setLevel(level);
            errorLog.setExceptionClass(e.getClass().getName());
            errorLog.setExceptionMessage(truncate(e.getMessage(), MAX_MESSAGE_LENGTH));
            errorLog.setStackTrace(truncate(getStackTrace(e), MAX_STACK_TRACE_LENGTH));
            errorLog.setRequestPath(request.getRequestURI());
            errorLog.setRequestMethod(request.getMethod());
            errorLog.setRequestParams(request.getQueryString());
            errorLog.setUserId(SecurityUtils.getCurrentUserId());
            errorLog.setIp(IpUtils.getClientIp(request));
            logWriteService.writeErrorLog(errorLog);
        } catch (Exception ex) {
            log.error("写入异常日志到数据库失败", ex);
        }
    }

    private String getStackTrace(Exception e) {
        StringWriter sw = new StringWriter();
        e.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    private String truncate(String str, int maxLength) {
        if (str == null) return null;
        return str.length() > maxLength ? str.substring(0, maxLength) : str;
    }
}
