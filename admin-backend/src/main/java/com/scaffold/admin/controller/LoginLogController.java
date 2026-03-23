package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.mapper.AdminLoginLogMapper;
import com.scaffold.admin.model.entity.AdminLoginLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/logs/login")
@RequiredArgsConstructor
@Tag(name = "log-login", description = "登录日志查询")
public class LoginLogController {

    private final AdminLoginLogMapper loginLogMapper;

    @GetMapping
    @Operation(operationId = "listLoginLogs", summary = "登录日志列表", description = "分页查询登录日志")
    public R<Page<AdminLoginLog>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        Page<AdminLoginLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminLoginLog> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.like(AdminLoginLog::getUsername, keyword);
        }
        if (status != null && !status.isBlank()) {
            query.eq(AdminLoginLog::getStatus, status);
        }
        if (startTime != null) {
            query.ge(AdminLoginLog::getCreateTime, startTime);
        }
        if (endTime != null) {
            query.le(AdminLoginLog::getCreateTime, endTime);
        }

        query.orderByDesc(AdminLoginLog::getCreateTime);
        return R.ok(loginLogMapper.selectPage(page, query));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getLoginLogDetail", summary = "登录日志详情", description = "获取单条登录日志详情")
    public R<AdminLoginLog> getDetail(@PathVariable("id") Long id) {
        AdminLoginLog log = loginLogMapper.selectById(id);
        if (log == null) {
            return R.error(404, "日志不存在");
        }
        return R.ok(log);
    }
}
