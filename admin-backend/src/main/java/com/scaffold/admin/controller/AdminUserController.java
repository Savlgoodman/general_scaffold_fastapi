package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.dto.CreateAdminUserDTO;
import com.scaffold.admin.model.dto.UpdateAdminUserDTO;
import com.scaffold.admin.model.entity.AdminUser;
import com.scaffold.admin.model.vo.AdminUserVO;
import com.scaffold.admin.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/admin-users")
@RequiredArgsConstructor
@Tag(name = "admin-users", description = "用户管理相关接口")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    @Operation(operationId = "listUsers", summary = "用户列表", description = "分页获取用户列表")
    public R<Page<AdminUserVO>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "10") Integer pageSize,
        @RequestParam(required = false) String keyword
    ) {
        Page<AdminUser> page = adminUserService.getUserPage(pageNum, pageSize, keyword);

        Page<AdminUserVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream()
            .map(this::convertToVO)
            .collect(Collectors.toList()));

        return R.ok(voPage);
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getUserDetail", summary = "用户详情", description = "获取单个用户详情")
    public R<AdminUserVO> getDetail(@PathVariable("id") Long id) {
        AdminUser user = adminUserService.getUserById(id);
        if (user == null) {
            return R.error(ResultCode.NOT_FOUND, "用户不存在");
        }
        return R.ok(convertToVO(user));
    }

    @PostMapping
    @Operation(operationId = "createUser", summary = "创建用户", description = "创建新用户")
    public R<AdminUserVO> create(@RequestBody @Valid CreateAdminUserDTO dto) {
        AdminUser user = adminUserService.createUser(dto);
        return R.ok(convertToVO(user));
    }

    @PutMapping("/{id:\\d+}")
    @Operation(operationId = "updateUser", summary = "更新用户", description = "更新用户信息")
    public R<AdminUserVO> update(
        @PathVariable("id") Long id,
        @RequestBody @Valid UpdateAdminUserDTO dto
    ) {
        AdminUser user = adminUserService.updateUser(id, dto);
        return R.ok(convertToVO(user));
    }

    @DeleteMapping("/{id:\\d+}")
    @Operation(operationId = "deleteUser", summary = "删除用户", description = "删除单个用户")
    public R<Void> delete(@PathVariable("id") Long id) {
        adminUserService.deleteUser(id);
        return R.ok();
    }

    @DeleteMapping
    @Operation(operationId = "deleteUsersBatch", summary = "批量删除用户", description = "批量删除用户")
    public R<Void> deleteBatch(@RequestParam List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return R.error(ResultCode.PARAM_ERROR, "用户ID列表不能为空");
        }
        adminUserService.deleteUsers(ids);
        return R.ok();
    }

    private AdminUserVO convertToVO(AdminUser user) {
        if (user == null) {
            return null;
        }
        AdminUserVO vo = new AdminUserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatar());
        vo.setStatus(user.getStatus());
        vo.setIsSuperuser(user.getIsSuperuser());
        vo.setCreateTime(user.getCreateTime());
        vo.setUpdateTime(user.getUpdateTime());
        return vo;
    }
}
