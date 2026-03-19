package com.scaffold.admin.controller;

import com.scaffold.admin.common.R;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Tag(name = "health", description = "用于确认服务是否正常运行")
@RestController
public class HealthController {

    @Operation(summary = "健康检查", description = "返回服务状态和当前时间，用于确认服务是否正常运行")
    @GetMapping("/health")
    public R<String> health() {
        return R.ok("OK - " + LocalDateTime.now());
    }
}
