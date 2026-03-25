package com.scaffold.admin.service;

import com.scaffold.admin.mapper.AdminTaskLogMapper;
import com.scaffold.admin.model.entity.AdminTaskLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 任务执行日志服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskLogService {

    private final AdminTaskLogMapper taskLogMapper;

    /**
     * 记录任务开始
     */
    public Long startTask(String taskName, String taskGroup) {
        AdminTaskLog taskLog = new AdminTaskLog();
        taskLog.setTaskName(taskName);
        taskLog.setTaskGroup(taskGroup);
        taskLog.setStatus("running");
        taskLogMapper.insert(taskLog);
        return taskLog.getId();
    }

    /**
     * 记录任务成功
     */
    public void finishTask(Long logId, long durationMs, String detail) {
        AdminTaskLog taskLog = taskLogMapper.selectById(logId);
        if (taskLog != null) {
            taskLog.setStatus("success");
            taskLog.setDurationMs(durationMs);
            taskLog.setDetail(detail);
            taskLogMapper.updateById(taskLog);
        }
    }

    /**
     * 记录任务失败
     */
    public void failTask(Long logId, long durationMs, String message) {
        AdminTaskLog taskLog = taskLogMapper.selectById(logId);
        if (taskLog != null) {
            taskLog.setStatus("failed");
            taskLog.setDurationMs(durationMs);
            taskLog.setMessage(message);
            taskLogMapper.updateById(taskLog);
        }
    }
}
