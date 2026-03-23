package com.scaffold.admin.controller;

import com.scaffold.admin.common.R;
import com.scaffold.admin.model.dto.CreateMenuDTO;
import com.scaffold.admin.model.dto.SortMenuDTO;
import com.scaffold.admin.model.dto.UpdateMenuDTO;
import com.scaffold.admin.model.vo.MenuVO;
import com.scaffold.admin.service.MenuService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/menus")
@RequiredArgsConstructor
@Tag(name = "menus", description = "菜单管理相关接口")
public class MenuController {

    private final MenuService menuService;

    @GetMapping("/tree")
    @Operation(operationId = "getMenuTree", summary = "获取全量菜单树", description = "获取所有菜单的树形结构")
    public R<List<MenuVO>> getMenuTree() {
        return R.ok(menuService.getMenuTree());
    }

    @GetMapping("/user-tree")
    @Operation(operationId = "getUserMenuTree", summary = "获取当前用户菜单树", description = "根据当前用户角色获取可见菜单树")
    public R<List<MenuVO>> getUserMenuTree() {
        AdminUserServiceImpl.AdminUserDetails userDetails =
                (AdminUserServiceImpl.AdminUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return R.ok(menuService.getUserMenuTree(userDetails.getId()));
    }

    @GetMapping("/{id:\\d+}")
    @Operation(operationId = "getMenuDetail", summary = "菜单详情", description = "获取菜单详情")
    public R<MenuVO> getDetail(@PathVariable("id") Long id) {
        return R.ok(menuService.getMenuById(id));
    }

    @PostMapping
    @Operation(operationId = "createMenu", summary = "创建菜单", description = "创建新菜单")
    public R<Void> create(@RequestBody @Valid CreateMenuDTO dto) {
        menuService.createMenu(dto);
        return R.ok();
    }

    @PutMapping("/{id:\\d+}")
    @Operation(operationId = "updateMenu", summary = "更新菜单", description = "更新菜单信息")
    public R<Void> update(@PathVariable("id") Long id, @RequestBody @Valid UpdateMenuDTO dto) {
        menuService.updateMenu(id, dto);
        return R.ok();
    }

    @DeleteMapping("/{id:\\d+}")
    @Operation(operationId = "deleteMenu", summary = "删除菜单", description = "删除菜单及其子菜单")
    public R<Void> delete(@PathVariable("id") Long id) {
        menuService.deleteMenu(id);
        return R.ok();
    }

    @PutMapping("/sort")
    @Operation(operationId = "sortMenus", summary = "批量排序菜单", description = "批量更新菜单排序值")
    public R<Void> sort(@RequestBody @Valid SortMenuDTO dto) {
        menuService.sortMenus(dto.getItems());
        return R.ok();
    }
}
