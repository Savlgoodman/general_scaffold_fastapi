package com.scaffold.admin.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.common.R;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminRoleMapper;
import com.scaffold.admin.model.dto.CreateRoleDTO;
import com.scaffold.admin.model.dto.SyncRoleMenusDTO;
import com.scaffold.admin.model.dto.SyncRolePermissionsDTO;
import com.scaffold.admin.model.dto.UpdateRoleDTO;
import com.scaffold.admin.model.entity.AdminRole;
import com.scaffold.admin.model.vo.RoleBaseVO;
import com.scaffold.admin.model.vo.RoleMenuVO;
import com.scaffold.admin.model.vo.RolePermissionFullVO;
import com.scaffold.admin.service.MenuService;
import com.scaffold.admin.service.RBACService;
import com.scaffold.admin.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
@Tag(name = "roles", description = "角色管理相关接口")
public class RoleController {

    private final RoleService roleService;
    private final RBACService rbacService;
    private final MenuService menuService;
    private final AdminRoleMapper roleMapper;

    @GetMapping
    @Operation(operationId = "listRoles", summary = "角色列表", description = "分页获取角色列表")
    public R<Page<RoleBaseVO>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "10") Integer pageSize,
        @RequestParam(required = false) String keyword
    ) {
        Page<AdminRole> page = new Page<>(pageNum, pageSize);

        LambdaQueryWrapper<AdminRole> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(AdminRole::getIsDeleted, 0)
            .orderByAsc(AdminRole::getSort);

        if (keyword != null && !keyword.isEmpty()) {
            queryWrapper.and(w -> w
                .like(AdminRole::getName, keyword)
                .or()
                .like(AdminRole::getCode, keyword)
            );
        }

        Page<AdminRole> rolePage = roleMapper.selectPage(page, queryWrapper);

        Page<RoleBaseVO> voPage = new Page<>(rolePage.getCurrent(), rolePage.getSize(), rolePage.getTotal());
        voPage.setRecords(rolePage.getRecords().stream()
            .map(this::toRoleBaseVO)
            .toList());

        return R.ok(voPage);
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getRoleDetail", summary = "角色详情", description = "获取角色详情")
    public R<RoleBaseVO> getDetail(@PathVariable("id") Long id) {
        AdminRole role = roleMapper.selectById(id);
        if (role == null) {
            return R.error(ResultCode.NOT_FOUND, "角色不存在");
        }
        return R.ok(toRoleBaseVO(role));
    }

    @PostMapping
    @Operation(operationId = "createRole", summary = "创建角色", description = "创建新角色")
    public R<RoleBaseVO> create(@RequestBody @Valid CreateRoleDTO dto) {
        AdminRole role = roleService.createRole(dto);
        return R.ok(toRoleBaseVO(role));
    }

    @PutMapping("/{id:\\d+}")
    @Operation(operationId = "updateRole", summary = "更新角色", description = "更新角色信息")
    public R<RoleBaseVO> update(
        @PathVariable("id") Long id,
        @RequestBody @Valid UpdateRoleDTO dto
    ) {
        AdminRole role = roleService.updateRole(id, dto);
        return R.ok(toRoleBaseVO(role));
    }

    @DeleteMapping("/{id:\\d+}")
    @Operation(operationId = "deleteRole", summary = "删除角色", description = "删除单个角色")
    public R<Void> delete(@PathVariable("id") Long id) {
        roleService.deleteRole(id);
        return R.ok();
    }

    @DeleteMapping
    @Operation(operationId = "deleteRolesBatch", summary = "批量删除角色", description = "批量删除角色")
    public R<Void> deleteBatch(@RequestParam List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return R.error(ResultCode.PARAM_ERROR, "角色ID列表不能为空");
        }
        roleService.deleteRoles(ids);
        return R.ok();
    }

    @GetMapping("/{id:\\d+}/permissions")
    @Operation(operationId = "getRolePermissions", summary = "角色权限完整视图", description = "获取角色所有权限及分配状态（含组覆盖标记）")
    public R<RolePermissionFullVO> getPermissions(@PathVariable("id") Long id) {
        RolePermissionFullVO permissions = rbacService.getRolePermissionsFull(id);
        if (permissions == null) {
            return R.error(ResultCode.NOT_FOUND, "角色不存在");
        }
        return R.ok(permissions);
    }

    @PutMapping("/{id:\\d+}/permissions")
    @Operation(operationId = "syncRolePermissions", summary = "同步角色权限", description = "原子同步角色权限（对比差异，批量增删改）")
    public R<Void> syncPermissions(
        @PathVariable("id") Long id,
        @RequestBody @Valid SyncRolePermissionsDTO dto
    ) {
        rbacService.syncRolePermissions(id, dto);
        return R.ok();
    }

    @GetMapping("/{id:\\d+}/menus")
    @Operation(operationId = "getRoleMenus", summary = "角色菜单视图", description = "获取角色所有菜单及分配状态")
    public R<RoleMenuVO> getMenus(@PathVariable("id") Long id) {
        return R.ok(menuService.getRoleMenus(id));
    }

    @PutMapping("/{id:\\d+}/menus")
    @Operation(operationId = "syncRoleMenus", summary = "同步角色菜单", description = "原子同步角色菜单（对比差异，批量增删）")
    public R<Void> syncMenus(
        @PathVariable("id") Long id,
        @RequestBody @Valid SyncRoleMenusDTO dto
    ) {
        menuService.syncRoleMenus(id, dto.getMenuIds());
        return R.ok();
    }

    private RoleBaseVO toRoleBaseVO(AdminRole role) {
        RoleBaseVO vo = new RoleBaseVO();
        vo.setId(role.getId());
        vo.setName(role.getName());
        vo.setCode(role.getCode());
        vo.setDescription(role.getDescription());
        vo.setStatus(role.getStatus());
        vo.setSort(role.getSort());
        return vo;
    }
}
