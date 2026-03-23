package com.scaffold.admin.service;

import com.scaffold.admin.mapper.AdminApiLogMapper;
import com.scaffold.admin.mapper.AdminErrorLogMapper;
import com.scaffold.admin.mapper.AdminOperationLogMapper;
import com.scaffold.admin.model.entity.AdminApiLog;
import com.scaffold.admin.model.entity.AdminErrorLog;
import com.scaffold.admin.model.entity.AdminOperationLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * 异步日志写入服务
 * 所有日志入库操作通过此服务异步执行，不阻塞业务请求
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogWriteService {

    private final AdminApiLogMapper apiLogMapper;
    private final AdminErrorLogMapper errorLogMapper;
    private final AdminOperationLogMapper operationLogMapper;

    @Async("logExecutor")
    public void writeApiLog(AdminApiLog apiLog) {
        try {
            apiLogMapper.insert(apiLog);
        } catch (Exception e) {
            log.error("写入API日志失败", e);
        }
    }

    @Async("logExecutor")
    public void writeErrorLog(AdminErrorLog errorLog) {
        try {
            errorLogMapper.insert(errorLog);
        } catch (Exception e) {
            log.error("写入异常日志失败", e);
        }
    }

    @Async("logExecutor")
    public void writeOperationLog(AdminOperationLog operationLog) {
        try {
            operationLogMapper.insert(operationLog);
        } catch (Exception e) {
            log.error("写入操作日志失败", e);
        }
    }
}
