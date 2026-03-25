package com.scaffold.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminTaskConfigMapper;
import com.scaffold.admin.model.entity.AdminTaskConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.function.Supplier;

/**
 * 任务执行统一入口
 * 所有任务执行（定时+手动）都经过此 Service，统一记录执行日志
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskExecutorService {

    private final TaskLogService taskLogService;
    private final AdminTaskConfigMapper taskConfigMapper;

    // 任务注册表：taskName → 执行逻辑（返回执行结果描述）
    private Map<String, Supplier<String>> taskRegistry;

    /**
     * 注册任务（由 DynamicTaskScheduler 启动时调用）
     */
    public void setTaskRegistry(Map<String, Supplier<String>> registry) {
        this.taskRegistry = registry;
    }

    /**
     * 执行指定任务，记录日志和执行状态
     */
    public void execute(String taskName) {
        if (taskRegistry == null || !taskRegistry.containsKey(taskName)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "未知任务: " + taskName);
        }

        // 查任务配置获取 group
        AdminTaskConfig config = taskConfigMapper.selectOne(
            new LambdaQueryWrapper<AdminTaskConfig>().eq(AdminTaskConfig::getTaskName, taskName)
        );
        String group = config != null ? config.getTaskGroup() : "system";

        Long logId = taskLogService.startTask(taskName, group);
        long startTime = System.currentTimeMillis();

        try {
            String detail = taskRegistry.get(taskName).get();
            long duration = System.currentTimeMillis() - startTime;
            taskLogService.finishTask(logId, duration, detail);
            updateLastRun(taskName, "success");
            log.info("[Task] {} 执行成功: {} ({}ms)", taskName, detail, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            taskLogService.failTask(logId, duration, e.getMessage());
            updateLastRun(taskName, "failed");
            log.error("[Task] {} 执行失败: {} ({}ms)", taskName, e.getMessage(), duration);
        }
    }

    private void updateLastRun(String taskName, String status) {
        taskConfigMapper.update(null,
            new LambdaUpdateWrapper<AdminTaskConfig>()
                .eq(AdminTaskConfig::getTaskName, taskName)
                .set(AdminTaskConfig::getLastRunTime, LocalDateTime.now())
                .set(AdminTaskConfig::getLastRunStatus, status)
        );
    }
}
