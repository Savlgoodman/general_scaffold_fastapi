package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.mapper.AdminErrorLogMapper;
import com.scaffold.admin.model.entity.AdminErrorLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/logs/error")
@RequiredArgsConstructor
@Tag(name = "log-error", description = "系统异常日志查询")
public class ErrorLogController {

    private final AdminErrorLogMapper errorLogMapper;

    @GetMapping
    @Operation(operationId = "listErrorLogs", summary = "异常日志列表", description = "分页查询系统异常日志")
    public R<Page<AdminErrorLog>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String level,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        Page<AdminErrorLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminErrorLog> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.and(w -> w
                .like(AdminErrorLog::getExceptionClass, keyword)
                .or()
                .like(AdminErrorLog::getRequestPath, keyword)
            );
        }
        if (level != null && !level.isBlank()) {
            query.eq(AdminErrorLog::getLevel, level);
        }
        if (startTime != null) {
            query.ge(AdminErrorLog::getCreateTime, startTime);
        }
        if (endTime != null) {
            query.le(AdminErrorLog::getCreateTime, endTime);
        }

        query.orderByDesc(AdminErrorLog::getCreateTime);
        return R.ok(errorLogMapper.selectPage(page, query));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getErrorLogDetail", summary = "异常日志详情", description = "获取单条异常日志详情")
    public R<AdminErrorLog> getDetail(@PathVariable("id") Long id) {
        AdminErrorLog log = errorLogMapper.selectById(id);
        if (log == null) {
            return R.error(404, "日志不存在");
        }
        return R.ok(log);
    }
}
