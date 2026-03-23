package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.mapper.AdminApiLogMapper;
import com.scaffold.admin.model.entity.AdminApiLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/logs/api")
@RequiredArgsConstructor
@Tag(name = "log-api", description = "API请求日志查询")
public class ApiLogController {

    private final AdminApiLogMapper apiLogMapper;

    @GetMapping
    @Operation(operationId = "listApiLogs", summary = "API日志列表", description = "分页查询API请求日志")
    public R<Page<AdminApiLog>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String method,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        Page<AdminApiLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminApiLog> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.and(w -> w
                .like(AdminApiLog::getPath, keyword)
                .or()
                .like(AdminApiLog::getUsername, keyword)
            );
        }
        if (method != null && !method.isBlank()) {
            query.eq(AdminApiLog::getMethod, method);
        }
        if (startTime != null) {
            query.ge(AdminApiLog::getCreateTime, startTime);
        }
        if (endTime != null) {
            query.le(AdminApiLog::getCreateTime, endTime);
        }

        query.orderByDesc(AdminApiLog::getCreateTime);
        return R.ok(apiLogMapper.selectPage(page, query));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getApiLogDetail", summary = "API日志详情", description = "获取单条API日志详情")
    public R<AdminApiLog> getDetail(@PathVariable("id") Long id) {
        AdminApiLog log = apiLogMapper.selectById(id);
        if (log == null) {
            return R.error(404, "日志不存在");
        }
        return R.ok(log);
    }
}
