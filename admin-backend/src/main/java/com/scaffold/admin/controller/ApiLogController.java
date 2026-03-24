package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.mapper.AdminApiLogMapper;
import com.scaffold.admin.model.entity.AdminApiLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/logs/api")
@RequiredArgsConstructor
@Tag(name = "log-api", description = "API请求日志查询")
public class ApiLogController {

    private final AdminApiLogMapper apiLogMapper;

    @GetMapping
    @Operation(operationId = "listApiLogs", summary = "API日志列表", description = "分页查询API请求日志，关联权限表展示API名称")
    public R<Page<AdminApiLog>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String method,
        @RequestParam(required = false) String startTime,
        @RequestParam(required = false) String endTime
    ) {
        Page<AdminApiLog> page = new Page<>(pageNum, pageSize);
        return R.ok(apiLogMapper.selectPageWithApiName(page, keyword, method, startTime, endTime));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getApiLogDetail", summary = "API日志详情", description = "获取单条API日志详情")
    public R<AdminApiLog> getDetail(@PathVariable("id") Long id) {
        AdminApiLog log = apiLogMapper.selectByIdWithApiName(id);
        if (log == null) {
            return R.error(404, "日志不存在");
        }
        return R.ok(log);
    }
}
