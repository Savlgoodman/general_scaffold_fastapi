package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminMenuMapper;
import com.scaffold.admin.mapper.AdminRoleMenuMapper;
import com.scaffold.admin.mapper.AdminUserRoleMapper;
import com.scaffold.admin.model.dto.CreateMenuDTO;
import com.scaffold.admin.model.dto.UpdateMenuDTO;
import com.scaffold.admin.model.entity.AdminMenu;
import com.scaffold.admin.model.entity.AdminRoleMenu;
import com.scaffold.admin.model.entity.AdminUserRole;
import com.scaffold.admin.model.vo.MenuVO;
import com.scaffold.admin.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final AdminMenuMapper menuMapper;
    private final AdminUserRoleMapper userRoleMapper;
    private final AdminRoleMenuMapper roleMenuMapper;

    @Override
    public List<MenuVO> getMenuTree() {
        List<AdminMenu> allMenus = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>()
                        .orderByAsc(AdminMenu::getSort)
        );
        return buildTree(allMenus);
    }

    @Override
    public List<MenuVO> getUserMenuTree(Long userId) {
        // 1. 查用户的角色ID列表
        List<AdminUserRole> userRoles = userRoleMapper.selectList(
                new LambdaQueryWrapper<AdminUserRole>()
                        .eq(AdminUserRole::getUserId, userId)
        );
        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> roleIds = userRoles.stream()
                .map(AdminUserRole::getRoleId)
                .toList();

        // 2. 查角色关联��菜单ID列表
        List<AdminRoleMenu> roleMenus = roleMenuMapper.selectList(
                new LambdaQueryWrapper<AdminRoleMenu>()
                        .in(AdminRoleMenu::getRoleId, roleIds)
        );
        if (roleMenus.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> menuIds = roleMenus.stream()
                .map(AdminRoleMenu::getMenuId)
                .collect(Collectors.toSet());

        // 3. 查菜单详情
        List<AdminMenu> menus = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>()
                        .in(AdminMenu::getId, menuIds)
                        .orderByAsc(AdminMenu::getSort)
        );

        // 4. 补充父级目录（确保树形结构完整）
        Set<Long> existingIds = menus.stream()
                .map(AdminMenu::getId)
                .collect(Collectors.toSet());
        Set<Long> parentIds = menus.stream()
                .map(AdminMenu::getParentId)
                .filter(pid -> pid != null && pid != 0 && !existingIds.contains(pid))
                .collect(Collectors.toSet());
        if (!parentIds.isEmpty()) {
            List<AdminMenu> parentMenus = menuMapper.selectList(
                    new LambdaQueryWrapper<AdminMenu>()
                            .in(AdminMenu::getId, parentIds)
            );
            menus.addAll(parentMenus);
        }

        return buildTree(menus);
    }

    @Override
    public MenuVO getMenuById(Long id) {
        AdminMenu menu = menuMapper.selectById(id);
        if (menu == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "菜单不存在");
        }
        return toMenuVO(menu);
    }

    @Override
    @Transactional
    public void createMenu(CreateMenuDTO dto) {
        AdminMenu menu = new AdminMenu();
        BeanUtils.copyProperties(dto, menu);
        menuMapper.insert(menu);
    }

    @Override
    @Transactional
    public void updateMenu(Long id, UpdateMenuDTO dto) {
        AdminMenu menu = menuMapper.selectById(id);
        if (menu == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "菜单不存在");
        }
        if (dto.getName() != null) menu.setName(dto.getName());
        if (dto.getPath() != null) menu.setPath(dto.getPath());
        if (dto.getIcon() != null) menu.setIcon(dto.getIcon());
        if (dto.getComponent() != null) menu.setComponent(dto.getComponent());
        if (dto.getParentId() != null) menu.setParentId(dto.getParentId());
        if (dto.getType() != null) menu.setType(dto.getType());
        if (dto.getSort() != null) menu.setSort(dto.getSort());
        menuMapper.updateById(menu);
    }

    @Override
    @Transactional
    public void deleteMenu(Long id) {
        AdminMenu menu = menuMapper.selectById(id);
        if (menu == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "菜单不存在");
        }
        // 递归删除子菜单
        deleteChildren(id);
        menuMapper.deleteById(id);
    }

    private void deleteChildren(Long parentId) {
        List<AdminMenu> children = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>()
                        .eq(AdminMenu::getParentId, parentId)
        );
        for (AdminMenu child : children) {
            deleteChildren(child.getId());
            menuMapper.deleteById(child.getId());
        }
    }

    private List<MenuVO> buildTree(List<AdminMenu> menus) {
        Map<Long, MenuVO> voMap = new LinkedHashMap<>();
        for (AdminMenu menu : menus) {
            voMap.put(menu.getId(), toMenuVO(menu));
        }

        List<MenuVO> roots = new ArrayList<>();
        for (MenuVO vo : voMap.values()) {
            if (vo.getParentId() == null || vo.getParentId() == 0) {
                roots.add(vo);
            } else {
                MenuVO parent = voMap.get(vo.getParentId());
                if (parent != null) {
                    if (parent.getChildren() == null) {
                        parent.setChildren(new ArrayList<>());
                    }
                    parent.getChildren().add(vo);
                }
            }
        }
        return roots;
    }

    private MenuVO toMenuVO(AdminMenu menu) {
        MenuVO vo = new MenuVO();
        vo.setId(menu.getId());
        vo.setName(menu.getName());
        vo.setPath(menu.getPath());
        vo.setIcon(menu.getIcon());
        vo.setComponent(menu.getComponent());
        vo.setParentId(menu.getParentId());
        vo.setType(menu.getType());
        vo.setSort(menu.getSort());
        return vo;
    }
}
