package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.mapper.AdminOperationLogMapper;
import com.scaffold.admin.model.entity.AdminOperationLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/logs/operation")
@RequiredArgsConstructor
@Tag(name = "log-operation", description = "操作审计日志查询")
public class OperationLogController {

    private final AdminOperationLogMapper operationLogMapper;

    @GetMapping
    @Operation(operationId = "listOperationLogs", summary = "操作日志列表", description = "分页查询操作审计日志")
    public R<Page<AdminOperationLog>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String module,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        Page<AdminOperationLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminOperationLog> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.like(AdminOperationLog::getUsername, keyword);
        }
        if (module != null && !module.isBlank()) {
            query.eq(AdminOperationLog::getModule, module);
        }
        if (type != null && !type.isBlank()) {
            query.eq(AdminOperationLog::getOperation, type);
        }
        if (startTime != null) {
            query.ge(AdminOperationLog::getCreateTime, startTime);
        }
        if (endTime != null) {
            query.le(AdminOperationLog::getCreateTime, endTime);
        }

        query.orderByDesc(AdminOperationLog::getCreateTime);
        return R.ok(operationLogMapper.selectPage(page, query));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getOperationLogDetail", summary = "操作日志详情", description = "获取单条操作日志详情")
    public R<AdminOperationLog> getDetail(@PathVariable("id") Long id) {
        AdminOperationLog log = operationLogMapper.selectById(id);
        if (log == null) {
            return R.error(404, "日志不存在");
        }
        return R.ok(log);
    }
}
