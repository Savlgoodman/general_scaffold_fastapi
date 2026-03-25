package com.scaffold.admin.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.mapper.AdminTaskConfigMapper;
import com.scaffold.admin.model.entity.AdminTaskConfig;
import com.scaffold.admin.service.FileService;
import com.scaffold.admin.service.LogCleanService;
import com.scaffold.admin.service.TaskExecutorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * 动态任务调度器
 * 从 admin_task_config 表读取 Cron 表达式，每次触发前重新查 DB，修改实时生效
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class DynamicTaskScheduler implements SchedulingConfigurer {

    private final AdminTaskConfigMapper taskConfigMapper;
    private final TaskExecutorService taskExecutorService;
    private final LogCleanService logCleanService;
    private final FileService fileService;

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        // 构建任务注册表：taskName → 业务逻辑
        Map<String, Supplier<String>> registry = new LinkedHashMap<>();
        registry.put("api-log-cleanup", logCleanService::cleanApiLogs);
        registry.put("operation-log-cleanup", logCleanService::cleanOperationLogs);
        registry.put("login-log-cleanup", logCleanService::cleanLoginLogs);
        registry.put("error-log-cleanup", logCleanService::cleanErrorLogs);
        registry.put("orphan-file-scan", fileService::scanOrphanFiles);
        registry.put("recycle-bin-cleanup", fileService::emptyRecycleBin);

        // 注入到 TaskExecutorService（手动触发也走同一份注册表）
        taskExecutorService.setTaskRegistry(registry);

        // 从 DB 加载所有任务，动态注册
        List<AdminTaskConfig> tasks = taskConfigMapper.selectList(
            new LambdaQueryWrapper<AdminTaskConfig>().eq(AdminTaskConfig::getIsDeleted, 0)
        );

        for (AdminTaskConfig task : tasks) {
            String taskName = task.getTaskName();
            if (!registry.containsKey(taskName)) {
                log.warn("任务 {} 在注册表中不存在，跳过", taskName);
                continue;
            }

            registrar.addTriggerTask(
                // 执行逻辑
                () -> taskExecutorService.execute(taskName),
                // Trigger：每次触发前从 DB 重新读取 Cron
                triggerContext -> {
                    AdminTaskConfig latest = taskConfigMapper.selectOne(
                        new LambdaQueryWrapper<AdminTaskConfig>()
                            .eq(AdminTaskConfig::getTaskName, taskName)
                    );
                    // 任务被删除或停用时返回 null，不再调度
                    if (latest == null || latest.getEnabled() != 1) {
                        return null;
                    }
                    try {
                        return new CronTrigger(latest.getCronExpression())
                            .nextExecution(triggerContext);
                    } catch (Exception e) {
                        log.error("任务 {} Cron 表达式无效: {}", taskName, latest.getCronExpression());
                        return null;
                    }
                }
            );

            log.info("注册动态任务: {} [{}] {}", task.getTaskLabel(), task.getCronExpression(),
                task.getEnabled() == 1 ? "启用" : "停用");
        }
    }
}
