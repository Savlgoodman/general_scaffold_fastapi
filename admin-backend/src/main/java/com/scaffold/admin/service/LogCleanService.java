package com.scaffold.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.mapper.AdminApiLogMapper;
import com.scaffold.admin.mapper.AdminErrorLogMapper;
import com.scaffold.admin.mapper.AdminLoginLogMapper;
import com.scaffold.admin.mapper.AdminOperationLogMapper;
import com.scaffold.admin.model.entity.AdminApiLog;
import com.scaffold.admin.model.entity.AdminErrorLog;
import com.scaffold.admin.model.entity.AdminLoginLog;
import com.scaffold.admin.model.entity.AdminOperationLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 日志清理服务
 * 业务逻辑在此，被 DynamicTaskScheduler 定时调用或 TaskController 手动调用
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogCleanService {

    @Value("${app.log.api-log-retention-days:30}")
    private int apiLogRetentionDays;

    @Value("${app.log.operation-log-retention-days:90}")
    private int operationLogRetentionDays;

    @Value("${app.log.login-log-retention-days:90}")
    private int loginLogRetentionDays;

    @Value("${app.log.error-log-retention-days:60}")
    private int errorLogRetentionDays;

    private final AdminApiLogMapper apiLogMapper;
    private final AdminOperationLogMapper operationLogMapper;
    private final AdminLoginLogMapper loginLogMapper;
    private final AdminErrorLogMapper errorLogMapper;

    public String cleanApiLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(apiLogRetentionDays);
        int deleted = apiLogMapper.delete(
            new LambdaQueryWrapper<AdminApiLog>().lt(AdminApiLog::getCreateTime, cutoff)
        );
        return "清理 API 日志 " + deleted + " 条（" + apiLogRetentionDays + " 天前）";
    }

    public String cleanOperationLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(operationLogRetentionDays);
        int deleted = operationLogMapper.delete(
            new LambdaQueryWrapper<AdminOperationLog>().lt(AdminOperationLog::getCreateTime, cutoff)
        );
        return "清理操作日志 " + deleted + " 条（" + operationLogRetentionDays + " 天前）";
    }

    public String cleanLoginLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(loginLogRetentionDays);
        int deleted = loginLogMapper.delete(
            new LambdaQueryWrapper<AdminLoginLog>().lt(AdminLoginLog::getCreateTime, cutoff)
        );
        return "清理登录日志 " + deleted + " 条（" + loginLogRetentionDays + " 天前）";
    }

    public String cleanErrorLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(errorLogRetentionDays);
        int deleted = errorLogMapper.delete(
            new LambdaQueryWrapper<AdminErrorLog>().lt(AdminErrorLog::getCreateTime, cutoff)
        );
        return "清理异常日志 " + deleted + " 条（" + errorLogRetentionDays + " 天前）";
    }
}
