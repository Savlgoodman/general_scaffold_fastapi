package com.scaffold.admin.controller;

import com.scaffold.admin.common.R;
import com.scaffold.admin.model.vo.OnlineUserVO;
import com.scaffold.admin.service.OnlineUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 在线用户管理
 */
@RestController
@RequestMapping("/api/admin/monitor/online-users")
@RequiredArgsConstructor
@Tag(name = "online-users", description = "在线用户管理")
public class OnlineUserController {

    private final OnlineUserService onlineUserService;

    @GetMapping
    @Operation(operationId = "listOnlineUsers", summary = "在线用户列表", description = "获取当前在线用户列表")
    public R<List<OnlineUserVO>> list() {
        return R.ok(onlineUserService.listOnlineUsers());
    }

    @DeleteMapping("/{userId:\\d+}")
    @Operation(operationId = "forceUserOffline", summary = "强制用户下线", description = "强制指定用户下线")
    public R<Void> forceOffline(@PathVariable("userId") Long userId) {
        onlineUserService.forceOffline(userId);
        return R.ok();
    }
}
