package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.mapper.AdminMenuMapper;
import com.scaffold.admin.mapper.AdminRoleMenuMapper;
import com.scaffold.admin.mapper.AdminUserRoleMapper;
import com.scaffold.admin.model.dto.CreateMenuDTO;
import com.scaffold.admin.model.dto.SortMenuDTO;
import com.scaffold.admin.model.dto.UpdateMenuDTO;
import com.scaffold.admin.model.entity.AdminMenu;
import com.scaffold.admin.model.entity.AdminRoleMenu;
import com.scaffold.admin.model.entity.AdminUserRole;
import com.scaffold.admin.model.vo.MenuVO;
import com.scaffold.admin.model.vo.RoleBaseVO;
import com.scaffold.admin.model.vo.RoleMenuVO;
import com.scaffold.admin.model.vo.UserMenuOverviewVO;
import com.scaffold.admin.mapper.AdminRoleMapper;
import com.scaffold.admin.mapper.AdminUserMapper;
import com.scaffold.admin.model.entity.AdminRole;
import com.scaffold.admin.model.entity.AdminUser;
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
    private final AdminUserMapper userMapper;
    private final AdminUserRoleMapper userRoleMapper;
    private final AdminRoleMenuMapper roleMenuMapper;
    private final AdminRoleMapper roleMapper;

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
        // 1. 查用户的存活角色（过滤已删除角色）
        List<AdminUserRole> userRoles = userRoleMapper.selectList(
                new LambdaQueryWrapper<AdminUserRole>()
                        .eq(AdminUserRole::getUserId, userId)
        );
        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> rawRoleIds = userRoles.stream().map(AdminUserRole::getRoleId).toList();
        // 过滤已删除和禁用角色
        List<AdminRole> activeRoles = roleMapper.selectList(
                new LambdaQueryWrapper<AdminRole>().in(AdminRole::getId, rawRoleIds).eq(AdminRole::getStatus, 1)
        );
        List<Long> roleIds = activeRoles.stream().map(AdminRole::getId).toList();
        if (roleIds.isEmpty()) {
            return Collections.emptyList();
        }

        // 2. 查角色关联的菜单ID列表
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
    @OperationLog(module = "菜单管理", type = OperationType.CREATE)
    public void createMenu(CreateMenuDTO dto) {
        AdminMenu menu = new AdminMenu();
        BeanUtils.copyProperties(dto, menu);
        menuMapper.insert(menu);
    }

    @Override
    @Transactional
    @OperationLog(module = "菜单管理", type = OperationType.UPDATE)
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
    @OperationLog(module = "菜单管理", type = OperationType.DELETE)
    public void deleteMenu(Long id) {
        AdminMenu menu = menuMapper.selectById(id);
        if (menu == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "菜单不存在");
        }
        // 递归删除子菜单
        deleteChildren(id);
        // 清理角色-菜单关联
        roleMenuMapper.delete(
            new LambdaQueryWrapper<AdminRoleMenu>().eq(AdminRoleMenu::getMenuId, id)
        );
        menuMapper.deleteById(id);
    }

    @Override
    @Transactional
    @OperationLog(module = "菜单管理", type = OperationType.UPDATE, description = "批量排序")
    public void sortMenus(List<SortMenuDTO.SortMenuDTOItem> items) {
        for (SortMenuDTO.SortMenuDTOItem item : items) {
            AdminMenu menu = new AdminMenu();
            menu.setId(item.getId());
            menu.setSort(item.getSort());
            menuMapper.updateById(menu);
        }
    }

    @Override
    public RoleMenuVO getRoleMenus(Long roleId) {
        AdminRole role = roleMapper.selectById(roleId);
        if (role == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在");
        }

        // 查该角色已分配的菜单ID
        List<AdminRoleMenu> roleMenus = roleMenuMapper.selectList(
                new LambdaQueryWrapper<AdminRoleMenu>()
                        .eq(AdminRoleMenu::getRoleId, roleId)
        );
        Set<Long> assignedIds = roleMenus.stream()
                .map(AdminRoleMenu::getMenuId)
                .collect(Collectors.toSet());

        // 查全量菜单树
        List<AdminMenu> allMenus = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>()
                        .orderByAsc(AdminMenu::getSort)
        );

        // 按 parentId 分组
        Map<Long, List<AdminMenu>> childrenMap = allMenus.stream()
                .filter(m -> m.getParentId() != null && m.getParentId() != 0)
                .collect(Collectors.groupingBy(AdminMenu::getParentId));

        List<AdminMenu> topMenus = allMenus.stream()
                .filter(m -> m.getParentId() == null || m.getParentId() == 0)
                .toList();

        // 构建分组
        List<RoleMenuVO.RoleMenuVOGroup> groups = new ArrayList<>();
        int totalMenus = 0;
        int assignedCount = 0;

        for (AdminMenu top : topMenus) {
            RoleMenuVO.RoleMenuVOGroup group = new RoleMenuVO.RoleMenuVOGroup();
            group.setId(top.getId());
            group.setName(top.getName());
            group.setPath(top.getPath());
            group.setIcon(top.getIcon());
            group.setType(top.getType());
            group.setAssigned(assignedIds.contains(top.getId()));

            totalMenus++;
            if (group.isAssigned()) assignedCount++;

            List<AdminMenu> children = childrenMap.getOrDefault(top.getId(), Collections.emptyList());
            boolean dirAssigned = "directory".equals(top.getType()) && group.isAssigned();

            List<RoleMenuVO.RoleMenuVOItem> items = new ArrayList<>();
            int childAssigned = 0;
            for (AdminMenu child : children) {
                RoleMenuVO.RoleMenuVOItem item = new RoleMenuVO.RoleMenuVOItem();
                item.setId(child.getId());
                item.setName(child.getName());
                item.setPath(child.getPath());
                item.setIcon(child.getIcon());
                item.setType(child.getType());
                item.setAssigned(assignedIds.contains(child.getId()) || dirAssigned);
                item.setCoveredByDirectory(dirAssigned);
                items.add(item);

                totalMenus++;
                if (item.isAssigned()) {
                    assignedCount++;
                    childAssigned++;
                }
            }
            group.setChildren(items);
            group.setTotalCount(children.size());
            group.setAssignedCount(childAssigned);

            groups.add(group);
        }

        RoleMenuVO.RoleMenuVOSummary summary = new RoleMenuVO.RoleMenuVOSummary();
        summary.setTotalMenus(totalMenus);
        summary.setAssignedCount(assignedCount);

        RoleMenuVO vo = new RoleMenuVO();
        vo.setRoleId(roleId);
        vo.setRoleName(role.getName());
        vo.setGroups(groups);
        vo.setSummary(summary);
        return vo;
    }

    @Override
    @Transactional
    @OperationLog(module = "菜单管理", type = OperationType.UPDATE, description = "同步角色菜单")
    public void syncRoleMenus(Long roleId, List<Long> menuIds) {
        // 目录覆盖：如果选中了 directory，自动加入其所有子菜单
        Set<Long> expandedIds = new HashSet<>(menuIds);
        if (!menuIds.isEmpty()) {
            List<AdminMenu> directories = menuMapper.selectList(
                    new LambdaQueryWrapper<AdminMenu>()
                            .in(AdminMenu::getId, menuIds)
                            .eq(AdminMenu::getType, "directory")
            );
            for (AdminMenu dir : directories) {
                List<AdminMenu> children = menuMapper.selectList(
                        new LambdaQueryWrapper<AdminMenu>()
                                .eq(AdminMenu::getParentId, dir.getId())
                );
                for (AdminMenu child : children) {
                    expandedIds.add(child.getId());
                }
            }
        }

        // 查当前已分配的菜单
        List<AdminRoleMenu> current = roleMenuMapper.selectList(
                new LambdaQueryWrapper<AdminRoleMenu>()
                        .eq(AdminRoleMenu::getRoleId, roleId)
        );
        Set<Long> currentIds = current.stream()
                .map(AdminRoleMenu::getMenuId)
                .collect(Collectors.toSet());

        // 需新增的
        Set<Long> toAdd = new HashSet<>(expandedIds);
        toAdd.removeAll(currentIds);
        for (Long menuId : toAdd) {
            AdminRoleMenu rm = new AdminRoleMenu();
            rm.setRoleId(roleId);
            rm.setMenuId(menuId);
            roleMenuMapper.insert(rm);
        }

        // 需删除的
        Set<Long> toRemove = new HashSet<>(currentIds);
        toRemove.removeAll(expandedIds);
        if (!toRemove.isEmpty()) {
            roleMenuMapper.delete(
                    new LambdaQueryWrapper<AdminRoleMenu>()
                            .eq(AdminRoleMenu::getRoleId, roleId)
                            .in(AdminRoleMenu::getMenuId, toRemove)
            );
        }
    }

    @Override
    public UserMenuOverviewVO getUserMenuOverview(Long userId) {
        AdminUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        boolean isSuperuser = user.getIsSuperuser() != null && user.getIsSuperuser() == 1;

        // 查用户存活角色（过滤已删除角色）
        List<AdminUserRole> userRoles = userRoleMapper.selectList(
                new LambdaQueryWrapper<AdminUserRole>().eq(AdminUserRole::getUserId, userId)
        );
        List<Long> rawRoleIds = userRoles.stream().map(AdminUserRole::getRoleId).toList();
        List<AdminRole> roles = rawRoleIds.isEmpty() ? Collections.emptyList() :
                roleMapper.selectList(new LambdaQueryWrapper<AdminRole>().in(AdminRole::getId, rawRoleIds).eq(AdminRole::getStatus, 1));
        List<Long> roleIds = roles.stream().map(AdminRole::getId).toList();

        List<RoleBaseVO> roleVOs = roles.stream().map(r -> {
            RoleBaseVO vo = new RoleBaseVO();
            vo.setId(r.getId());
            vo.setName(r.getName());
            vo.setCode(r.getCode());
            vo.setDescription(r.getDescription());
            vo.setStatus(r.getStatus());
            vo.setSort(r.getSort());
            return vo;
        }).toList();

        // 查全量菜单
        List<AdminMenu> allMenus = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>().orderByAsc(AdminMenu::getSort)
        );
        Map<Long, List<AdminMenu>> childrenMap = allMenus.stream()
                .filter(m -> m.getParentId() != null && m.getParentId() != 0)
                .collect(Collectors.groupingBy(AdminMenu::getParentId));
        List<AdminMenu> topMenus = allMenus.stream()
                .filter(m -> m.getParentId() == null || m.getParentId() == 0).toList();

        // 查角色-菜单关联：menuId → 角色名列表
        Map<Long, List<String>> menuSourceRoles = new HashMap<>();
        if (!roleIds.isEmpty()) {
            List<AdminRoleMenu> allRoleMenus = roleMenuMapper.selectList(
                    new LambdaQueryWrapper<AdminRoleMenu>().in(AdminRoleMenu::getRoleId, roleIds)
            );
            Map<Long, String> roleNameMap = roles.stream()
                    .collect(Collectors.toMap(AdminRole::getId, AdminRole::getName));
            for (AdminRoleMenu rm : allRoleMenus) {
                menuSourceRoles.computeIfAbsent(rm.getMenuId(), k -> new ArrayList<>())
                        .add(roleNameMap.getOrDefault(rm.getRoleId(), "未知角色"));
            }
        }

        // 构建分组
        List<UserMenuOverviewVO.UserMenuOverviewVOGroup> groups = new ArrayList<>();
        int totalMenus = 0;
        int grantedCount = 0;

        for (AdminMenu top : topMenus) {
            UserMenuOverviewVO.UserMenuOverviewVOGroup group = new UserMenuOverviewVO.UserMenuOverviewVOGroup();
            group.setId(top.getId());
            group.setName(top.getName());
            group.setPath(top.getPath());
            group.setIcon(top.getIcon());
            group.setType(top.getType());

            boolean topGranted;
            String topSource;
            List<String> topSourceRoles;

            if (isSuperuser) {
                topGranted = true;
                topSource = "SUPER_USER";
                topSourceRoles = Collections.emptyList();
            } else {
                topSourceRoles = menuSourceRoles.getOrDefault(top.getId(), Collections.emptyList());
                topGranted = !topSourceRoles.isEmpty();
                topSource = topGranted ? "ROLE" : "NONE";
            }
            group.setGranted(topGranted);
            group.setSource(topSource);
            group.setSourceRoles(topSourceRoles);

            totalMenus++;
            if (topGranted) grantedCount++;

            boolean dirGranted = "directory".equals(top.getType()) && topGranted;
            List<AdminMenu> children = childrenMap.getOrDefault(top.getId(), Collections.emptyList());
            List<UserMenuOverviewVO.UserMenuOverviewVOItem> items = new ArrayList<>();
            int childGranted = 0;

            for (AdminMenu child : children) {
                UserMenuOverviewVO.UserMenuOverviewVOItem item = new UserMenuOverviewVO.UserMenuOverviewVOItem();
                item.setId(child.getId());
                item.setName(child.getName());
                item.setPath(child.getPath());
                item.setIcon(child.getIcon());
                item.setType(child.getType());

                if (isSuperuser) {
                    item.setGranted(true);
                    item.setSource("SUPER_USER");
                    item.setSourceRoles(Collections.emptyList());
                    item.setCoveredByDirectory(false);
                } else {
                    List<String> childSourceRoles = menuSourceRoles.getOrDefault(child.getId(), Collections.emptyList());
                    boolean directlyGranted = !childSourceRoles.isEmpty();

                    if (dirGranted && !directlyGranted) {
                        item.setGranted(true);
                        item.setSource("DIRECTORY");
                        item.setSourceRoles(topSourceRoles);
                        item.setCoveredByDirectory(true);
                    } else {
                        item.setGranted(directlyGranted || dirGranted);
                        item.setSource(directlyGranted ? "ROLE" : (dirGranted ? "DIRECTORY" : "NONE"));
                        item.setSourceRoles(directlyGranted ? childSourceRoles : (dirGranted ? topSourceRoles : Collections.emptyList()));
                        item.setCoveredByDirectory(dirGranted && !directlyGranted);
                    }
                }
                items.add(item);
                totalMenus++;
                if (item.isGranted()) {
                    grantedCount++;
                    childGranted++;
                }
            }
            group.setChildren(items);
            group.setTotalCount(children.size());
            group.setGrantedCount(childGranted);
            groups.add(group);
        }

        UserMenuOverviewVO.UserMenuOverviewVOSummary summary = new UserMenuOverviewVO.UserMenuOverviewVOSummary();
        summary.setTotalMenus(totalMenus);
        summary.setGrantedCount(grantedCount);

        UserMenuOverviewVO vo = new UserMenuOverviewVO();
        vo.setUserId(userId);
        vo.setUsername(user.getUsername());
        vo.setSuperuser(isSuperuser);
        vo.setRoles(roleVOs);
        vo.setGroups(groups);
        vo.setSummary(summary);
        return vo;
    }

    private void deleteChildren(Long parentId) {
        List<AdminMenu> children = menuMapper.selectList(
                new LambdaQueryWrapper<AdminMenu>()
                        .eq(AdminMenu::getParentId, parentId)
        );
        for (AdminMenu child : children) {
            deleteChildren(child.getId());
            roleMenuMapper.delete(
                new LambdaQueryWrapper<AdminRoleMenu>().eq(AdminRoleMenu::getMenuId, child.getId())
            );
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
