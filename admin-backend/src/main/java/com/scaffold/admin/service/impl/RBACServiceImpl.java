package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.mapper.*;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.model.dto.SyncRolePermissionsDTO;
import com.scaffold.admin.model.dto.SyncUserOverridesDTO;
import com.scaffold.admin.model.entity.*;
import com.scaffold.admin.model.vo.*;
import com.scaffold.admin.service.PermissionService;
import com.scaffold.admin.service.RBACService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RBACServiceImpl implements RBACService {

    private final AdminUserMapper userMapper;
    private final AdminUserRoleMapper userRoleMapper;
    private final AdminRoleMapper roleMapper;
    private final AdminRolePermissionMapper rolePermissionMapper;
    private final AdminPermissionMapper permissionMapper;
    private final AdminUserPermissionOverrideMapper overrideMapper;
    private final PermissionService permissionService;

    // ==================== 用户-角色关联 ====================

    @Override
    public List<AdminRole> getUserRoles(Long userId) {
        List<AdminUserRole> userRoles = userRoleMapper.selectList(
            new LambdaQueryWrapper<AdminUserRole>()
                .eq(AdminUserRole::getUserId, userId)
                .eq(AdminUserRole::getIsDeleted, 0)
        );

        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> roleIds = userRoles.stream()
            .map(AdminUserRole::getRoleId)
            .collect(Collectors.toList());

        return roleMapper.selectList(
            new LambdaQueryWrapper<AdminRole>()
                .in(AdminRole::getId, roleIds)
                .eq(AdminRole::getIsDeleted, 0)
                .eq(AdminRole::getStatus, 1) // 过滤禁用角色
        );
    }

    @Override
    public Set<Long> getUserRoleIds(Long userId) {
        // 复用 getUserRoles 确保过滤已删除角色
        return getUserRoles(userId).stream()
            .map(AdminRole::getId)
            .collect(Collectors.toSet());
    }

    @Override
    public Set<String> getUserRoleCodes(Long userId) {
        return getUserRoles(userId).stream()
            .map(AdminRole::getCode)
            .collect(Collectors.toSet());
    }

    @Override
    public boolean hasRole(Long userId, String roleCode) {
        return getUserRoleCodes(userId).contains(roleCode);
    }

    @Override
    @Transactional
    public void assignUserRoles(Long userId, List<Long> roleIds) {
        for (Long roleId : roleIds) {
            AdminUserRole existing = userRoleMapper.selectOne(
                new LambdaQueryWrapper<AdminUserRole>()
                    .eq(AdminUserRole::getUserId, userId)
                    .eq(AdminUserRole::getRoleId, roleId)
                    .eq(AdminUserRole::getIsDeleted, 0)
            );

            if (existing == null) {
                AdminUserRole newUserRole = new AdminUserRole();
                newUserRole.setUserId(userId);
                newUserRole.setRoleId(roleId);
                userRoleMapper.insert(newUserRole);
            }
        }
    }

    @Override
    @Transactional
    public void removeUserRoles(Long userId, List<Long> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) return;
        userRoleMapper.delete(
            new LambdaQueryWrapper<AdminUserRole>()
                .eq(AdminUserRole::getUserId, userId)
                .in(AdminUserRole::getRoleId, roleIds)
        );
    }

    @Override
    @Transactional
    @OperationLog(module = "权限管理", type = OperationType.UPDATE, description = "同步用户角色")
    public void syncUserRoles(Long userId, List<Long> roleIds) {
        // 删除所有现有关联（@TableLogic 自动转为逻辑删除）
        userRoleMapper.delete(
            new LambdaQueryWrapper<AdminUserRole>()
                .eq(AdminUserRole::getUserId, userId)
        );

        if (roleIds != null && !roleIds.isEmpty()) {
            assignUserRoles(userId, roleIds);
        }
    }

    // ==================== 角色权限管理 ====================

    @Override
    public RolePermissionFullVO getRolePermissionsFull(Long roleId) {
        AdminRole role = roleMapper.selectById(roleId);
        if (role == null) {
            return null;
        }

        RolePermissionFullVO vo = new RolePermissionFullVO();
        vo.setRoleId(role.getId());
        vo.setRoleName(role.getName());
        vo.setRoleCode(role.getCode());

        // 一次查询：角色已分配的权限
        List<AdminRolePermission> rolePerms = rolePermissionMapper.selectList(
            new LambdaQueryWrapper<AdminRolePermission>()
                .eq(AdminRolePermission::getRoleId, roleId)
                .eq(AdminRolePermission::getIsDeleted, 0)
        );
        Map<Long, AdminRolePermission> assignedMap = rolePerms.stream()
            .collect(Collectors.toMap(AdminRolePermission::getPermissionId, rp -> rp, (a, b) -> a));

        // 一次查询：所有分组权限结构
        List<PermissionGroupVO> allGroups = permissionService.getAllGroupedPermissions();

        List<RolePermissionFullVO.GroupSection> groups = new ArrayList<>();
        int totalPermissions = 0, assignedCount = 0, grantCount = 0, denyCount = 0;

        for (PermissionGroupVO group : allGroups) {
            RolePermissionFullVO.GroupSection section = new RolePermissionFullVO.GroupSection();
            section.setGroupKey(group.getGroupKey());
            section.setGroupName(group.getGroupName());

            // 组权限
            PermissionBaseVO groupPerm = group.getGroupPermission();
            RolePermissionFullVO.PermissionItem groupItem = null;
            boolean groupIsGranted = false;

            if (groupPerm != null) {
                groupItem = buildPermissionItem(groupPerm, assignedMap);
                AdminRolePermission rp = assignedMap.get(groupPerm.getId());
                groupIsGranted = rp != null && "GRANT".equals(rp.getEffect());

                if (rp != null) {
                    assignedCount++;
                    if ("GRANT".equals(rp.getEffect())) grantCount++;
                    else denyCount++;
                }
                totalPermissions++;
            }
            section.setGroupPermission(groupItem);

            // 子权限
            List<RolePermissionFullVO.PermissionItem> children = new ArrayList<>();
            int childAssigned = 0;

            for (PermissionBaseVO child : group.getChildren()) {
                RolePermissionFullVO.PermissionItem childItem = buildPermissionItem(child, assignedMap);
                childItem.setCoveredByGroup(groupIsGranted);

                AdminRolePermission rp = assignedMap.get(child.getId());
                if (rp != null) {
                    childAssigned++;
                    assignedCount++;
                    if ("GRANT".equals(rp.getEffect())) grantCount++;
                    else denyCount++;
                }
                totalPermissions++;
                children.add(childItem);
            }

            section.setChildren(children);
            section.setTotalCount(group.getChildren().size() + (groupPerm != null ? 1 : 0));
            section.setAssignedCount(childAssigned + (groupItem != null && groupItem.isAssigned() ? 1 : 0));

            groups.add(section);
        }

        vo.setGroups(groups);

        RolePermissionFullVO.Summary summary = new RolePermissionFullVO.Summary();
        summary.setTotalPermissions(totalPermissions);
        summary.setAssignedCount(assignedCount);
        summary.setGrantCount(grantCount);
        summary.setDenyCount(denyCount);
        vo.setSummary(summary);

        return vo;
    }

    private RolePermissionFullVO.PermissionItem buildPermissionItem(
            PermissionBaseVO perm, Map<Long, AdminRolePermission> assignedMap) {
        RolePermissionFullVO.PermissionItem item = new RolePermissionFullVO.PermissionItem();
        item.setId(perm.getId());
        item.setName(perm.getName());
        item.setCode(perm.getCode());
        item.setPath(perm.getPath());
        item.setMethod(perm.getMethod());

        AdminRolePermission rp = assignedMap.get(perm.getId());
        if (rp != null) {
            item.setAssigned(true);
            item.setEffect(rp.getEffect());
        } else {
            item.setAssigned(false);
            item.setEffect(null);
        }
        item.setCoveredByGroup(false);
        return item;
    }

    @Override
    @Transactional
    @OperationLog(module = "权限管理", type = OperationType.UPDATE, description = "同步角色权限")
    public void syncRolePermissions(Long roleId, SyncRolePermissionsDTO dto) {
        // 1. 查询当前状态
        List<AdminRolePermission> currentPerms = rolePermissionMapper.selectList(
            new LambdaQueryWrapper<AdminRolePermission>()
                .eq(AdminRolePermission::getRoleId, roleId)
                .eq(AdminRolePermission::getIsDeleted, 0)
        );
        Map<Long, AdminRolePermission> currentMap = currentPerms.stream()
            .collect(Collectors.toMap(AdminRolePermission::getPermissionId, rp -> rp, (a, b) -> a));

        // 2. 构建期望状态
        Set<Long> desiredIds = new HashSet<>();
        for (SyncRolePermissionsDTO.Item item : dto.getPermissions()) {
            desiredIds.add(item.getPermissionId());

            AdminRolePermission existing = currentMap.get(item.getPermissionId());
            if (existing != null) {
                // 已存在 - 如果 effect 变化则更新
                if (!existing.getEffect().equals(item.getEffect())) {
                    existing.setEffect(item.getEffect());
                    rolePermissionMapper.updateById(existing);
                }
            } else {
                // 不存在 - 新增
                AdminRolePermission newPerm = new AdminRolePermission();
                newPerm.setRoleId(roleId);
                newPerm.setPermissionId(item.getPermissionId());
                newPerm.setEffect(item.getEffect());
                newPerm.setPriority(0);
                rolePermissionMapper.insert(newPerm);
            }
        }

        // 3. 软删除不在期望集合中的权限
        Set<Long> toRemove = currentMap.keySet().stream()
            .filter(id -> !desiredIds.contains(id))
            .collect(Collectors.toSet());

        if (!toRemove.isEmpty()) {
            rolePermissionMapper.delete(
                new LambdaQueryWrapper<AdminRolePermission>()
                    .eq(AdminRolePermission::getRoleId, roleId)
                    .in(AdminRolePermission::getPermissionId, toRemove)
            );
        }
    }

// ==================== 用户权限总览 ====================

    @Override
    public UserPermissionOverviewVO getUserPermissionOverview(Long userId) {
        AdminUser user = userMapper.selectById(userId);
        if (user == null) {
            return null;
        }

        UserPermissionOverviewVO vo = new UserPermissionOverviewVO();
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setSuperuser(user.getIsSuperuser() != null && user.getIsSuperuser() == 1);

        // 1. 获取用户角色
        List<AdminRole> roles = getUserRoles(userId);
        vo.setRoles(roles.stream().map(role -> {
            RoleBaseVO roleVO = new RoleBaseVO();
            roleVO.setId(role.getId());
            roleVO.setName(role.getName());
            roleVO.setCode(role.getCode());
            roleVO.setDescription(role.getDescription());
            roleVO.setStatus(role.getStatus());
            roleVO.setSort(role.getSort());
            return roleVO;
        }).collect(Collectors.toList()));

        // 2. 获取全部活跃权限
        List<AdminPermission> allPerms = permissionService.getActivePermissions();

        // 超级管理员：所有权限GRANT
        if (vo.isSuperuser()) {
            return buildSuperuserOverview(vo, allPerms);
        }

        // 3. 批量获取所有角色的权限映射（消除N+1查询）
        Set<Long> roleIds = roles.stream().map(AdminRole::getId).collect(Collectors.toSet());
        Map<Long, List<RolePermissionInfo>> permToRoles = new HashMap<>();

        if (!roleIds.isEmpty()) {
            List<AdminRolePermission> allRolePerms = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<AdminRolePermission>()
                    .in(AdminRolePermission::getRoleId, roleIds)
                    .eq(AdminRolePermission::getIsDeleted, 0)
            );

            // 构建角色名映射
            Map<Long, String> roleNameMap = roles.stream()
                .collect(Collectors.toMap(AdminRole::getId, AdminRole::getName));

            for (AdminRolePermission rp : allRolePerms) {
                RolePermissionInfo info = new RolePermissionInfo();
                info.roleId = rp.getRoleId();
                info.roleName = roleNameMap.getOrDefault(rp.getRoleId(), "");
                info.effect = rp.getEffect();
                info.priority = rp.getPriority();

                permToRoles.computeIfAbsent(rp.getPermissionId(), k -> new ArrayList<>()).add(info);
            }
        }

        // 4. 获取用户覆盖
        List<AdminUserPermissionOverride> overrides = overrideMapper.selectList(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getUserId, userId)
                .eq(AdminUserPermissionOverride::getIsDeleted, 0)
        );
        Map<Long, AdminUserPermissionOverride> overrideMap = overrides.stream()
            .collect(Collectors.toMap(AdminUserPermissionOverride::getPermissionId, o -> o, (a, b) -> a));

        // 5. 组装分组视图
        List<PermissionGroupVO> allGroups = permissionService.getAllGroupedPermissions();
        List<UserPermissionOverviewVO.UserPermGroupSection> groups = new ArrayList<>();
        List<UserPermissionOverviewVO.OverrideItem> overrideItems = new ArrayList<>();
        int grantedCount = 0, deniedCount = 0, unassignedCount = 0;

        for (PermissionGroupVO group : allGroups) {
            UserPermissionOverviewVO.UserPermGroupSection section = new UserPermissionOverviewVO.UserPermGroupSection();
            section.setGroupKey(group.getGroupKey());
            section.setGroupName(group.getGroupName());

            List<UserPermissionOverviewVO.PermissionRow> children = new ArrayList<>();

            // 先计算组权限是否被 GRANT（用于判断子权限是否被组覆盖）
            boolean groupIsGranted = false;
            List<String> groupSourceRoles = Collections.emptyList();

            if (group.getGroupPermission() != null) {
                PermissionBaseVO gp = group.getGroupPermission();
                UserPermissionOverviewVO.PermissionRow row = buildPermissionRow(
                    gp.getId(), gp.getName(), gp.getPath(), gp.getMethod(), true,
                    permToRoles, overrideMap
                );
                children.add(row);

                groupIsGranted = "GRANT".equals(row.getFinalEffect());
                groupSourceRoles = row.getSourceRoles();

                if ("GRANT".equals(row.getFinalEffect())) grantedCount++;
                else if ("DENY".equals(row.getFinalEffect())) deniedCount++;
                else unassignedCount++;

                if (row.isHasOverride()) {
                    overrideItems.add(buildOverrideItem(overrideMap.get(gp.getId()), gp));
                }
            }

            // 添加子权限（如果组权限已 GRANT，子权限标记为被组覆盖）
            for (PermissionBaseVO child : group.getChildren()) {
                UserPermissionOverviewVO.PermissionRow row = buildPermissionRow(
                    child.getId(), child.getName(), child.getPath(), child.getMethod(), false,
                    permToRoles, overrideMap
                );

                // 组权限已 GRANT 且子权限没有直接分配也没有覆盖 → 被组覆盖
                if (groupIsGranted && "NONE".equals(row.getSource())) {
                    row.setFinalEffect("GRANT");
                    row.setSource("ROLE");
                    row.setSourceRoles(groupSourceRoles);
                    row.setCoveredByGroup(true);
                }

                children.add(row);

                if ("GRANT".equals(row.getFinalEffect())) grantedCount++;
                else if ("DENY".equals(row.getFinalEffect())) deniedCount++;
                else unassignedCount++;

                if (row.isHasOverride()) {
                    overrideItems.add(buildOverrideItem(overrideMap.get(child.getId()), child));
                }
            }

            section.setChildren(children);
            groups.add(section);
        }

        vo.setGroups(groups);
        vo.setOverrides(overrideItems);

        UserPermissionOverviewVO.UserPermSummary summary = new UserPermissionOverviewVO.UserPermSummary();
        summary.setTotalPermissions(grantedCount + deniedCount + unassignedCount);
        summary.setGrantedCount(grantedCount);
        summary.setDeniedCount(deniedCount);
        summary.setUnassignedCount(unassignedCount);
        summary.setOverrideCount(overrideItems.size());
        vo.setSummary(summary);

        return vo;
    }

    /**
     * 构建权限行（计算来源和最终效果）
     */
    private UserPermissionOverviewVO.PermissionRow buildPermissionRow(
            Long permId, String name, String path, String method, boolean isGroup,
            Map<Long, List<RolePermissionInfo>> permToRoles,
            Map<Long, AdminUserPermissionOverride> overrideMap) {

        UserPermissionOverviewVO.PermissionRow row = new UserPermissionOverviewVO.PermissionRow();
        row.setPermissionId(permId);
        row.setName(name);
        row.setPath(path);
        row.setMethod(method);
        row.setGroup(isGroup);

        // 检查角色来源
        List<RolePermissionInfo> roleInfos = permToRoles.getOrDefault(permId, Collections.emptyList());
        List<String> sourceRoles = roleInfos.stream()
            .filter(r -> "GRANT".equals(r.effect))
            .map(r -> r.roleName)
            .distinct()
            .collect(Collectors.toList());

        // 角色给出的最终效果（按优先级，DENY优先）
        String roleEffect = null;
        if (!roleInfos.isEmpty()) {
            roleInfos.sort((a, b) -> {
                if (a.priority != b.priority) return Integer.compare(b.priority, a.priority);
                return "DENY".equals(a.effect) ? -1 : 1;
            });
            roleEffect = roleInfos.get(0).effect;
            // 收集所有相关角色名
            sourceRoles = roleInfos.stream().map(r -> r.roleName).distinct().collect(Collectors.toList());
        }

        row.setSourceRoles(sourceRoles);

        // 检查覆盖
        AdminUserPermissionOverride override = overrideMap.get(permId);
        if (override != null) {
            row.setHasOverride(true);
            row.setOverrideId(override.getId());
            row.setOverrideEffect(override.getEffect());
            row.setFinalEffect(override.getEffect());
            row.setSource("OVERRIDE");
        } else if (roleEffect != null) {
            row.setHasOverride(false);
            row.setFinalEffect(roleEffect);
            row.setSource("ROLE");
        } else {
            row.setHasOverride(false);
            row.setFinalEffect(null);
            row.setSource("NONE");
        }

        return row;
    }

    private UserPermissionOverviewVO.OverrideItem buildOverrideItem(
            AdminUserPermissionOverride override, PermissionBaseVO perm) {
        UserPermissionOverviewVO.OverrideItem item = new UserPermissionOverviewVO.OverrideItem();
        item.setOverrideId(override.getId());
        item.setPermissionId(override.getPermissionId());
        item.setPermissionName(perm.getName());
        item.setPath(perm.getPath());
        item.setMethod(perm.getMethod());
        item.setEffect(override.getEffect());
        item.setCreateTime(override.getCreateTime());
        return item;
    }

    private UserPermissionOverviewVO buildSuperuserOverview(
            UserPermissionOverviewVO vo, List<AdminPermission> allPerms) {
        List<PermissionGroupVO> allGroups = permissionService.getAllGroupedPermissions();
        List<UserPermissionOverviewVO.UserPermGroupSection> groups = new ArrayList<>();
        int total = 0;

        for (PermissionGroupVO group : allGroups) {
            UserPermissionOverviewVO.UserPermGroupSection section = new UserPermissionOverviewVO.UserPermGroupSection();
            section.setGroupKey(group.getGroupKey());
            section.setGroupName(group.getGroupName());

            List<UserPermissionOverviewVO.PermissionRow> children = new ArrayList<>();

            if (group.getGroupPermission() != null) {
                children.add(buildSuperuserRow(group.getGroupPermission(), true));
                total++;
            }
            for (PermissionBaseVO child : group.getChildren()) {
                children.add(buildSuperuserRow(child, false));
                total++;
            }

            section.setChildren(children);
            groups.add(section);
        }

        vo.setGroups(groups);
        vo.setOverrides(Collections.emptyList());

        UserPermissionOverviewVO.UserPermSummary summary = new UserPermissionOverviewVO.UserPermSummary();
        summary.setTotalPermissions(total);
        summary.setGrantedCount(total);
        summary.setDeniedCount(0);
        summary.setUnassignedCount(0);
        summary.setOverrideCount(0);
        vo.setSummary(summary);

        return vo;
    }

    private UserPermissionOverviewVO.PermissionRow buildSuperuserRow(PermissionBaseVO perm, boolean isGroup) {
        UserPermissionOverviewVO.PermissionRow row = new UserPermissionOverviewVO.PermissionRow();
        row.setPermissionId(perm.getId());
        row.setName(perm.getName());
        row.setPath(perm.getPath());
        row.setMethod(perm.getMethod());
        row.setGroup(isGroup);
        row.setFinalEffect("GRANT");
        row.setSource("SUPER_USER");
        row.setSourceRoles(Collections.emptyList());
        row.setHasOverride(false);
        return row;
    }

    // ==================== 用户权限覆盖 ====================

    @Override
    @Transactional
    @OperationLog(module = "权限管理", type = OperationType.UPDATE, description = "同步用户权限覆盖")
    public void syncUserOverrides(Long userId, SyncUserOverridesDTO dto) {
        // 1. 查询当前覆盖
        List<AdminUserPermissionOverride> currentOverrides = overrideMapper.selectList(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getUserId, userId)
                .eq(AdminUserPermissionOverride::getIsDeleted, 0)
        );
        Map<Long, AdminUserPermissionOverride> currentMap = currentOverrides.stream()
            .collect(Collectors.toMap(AdminUserPermissionOverride::getPermissionId, o -> o, (a, b) -> a));

        // 2. 处理期望状态
        Set<Long> desiredIds = new HashSet<>();
        for (SyncUserOverridesDTO.Item item : dto.getOverrides()) {
            desiredIds.add(item.getPermissionId());

            AdminUserPermissionOverride existing = currentMap.get(item.getPermissionId());
            if (existing != null) {
                if (!existing.getEffect().equals(item.getEffect())) {
                    existing.setEffect(item.getEffect());
                    overrideMapper.updateById(existing);
                }
            } else {
                AdminUserPermissionOverride newOverride = new AdminUserPermissionOverride();
                newOverride.setUserId(userId);
                newOverride.setPermissionId(item.getPermissionId());
                newOverride.setEffect(item.getEffect());
                overrideMapper.insert(newOverride);
            }
        }

        // 3. 软删除不在期望集合中的覆盖
        Set<Long> toRemove = currentMap.keySet().stream()
            .filter(id -> !desiredIds.contains(id))
            .collect(Collectors.toSet());

        if (!toRemove.isEmpty()) {
            overrideMapper.delete(
                new LambdaQueryWrapper<AdminUserPermissionOverride>()
                    .eq(AdminUserPermissionOverride::getUserId, userId)
                    .in(AdminUserPermissionOverride::getPermissionId, toRemove)
            );
        }
    }

    @Override
    @Transactional
    public void removeUserPermissionOverride(Long userId, Long overrideId) {
        // 使用 delete 让 @TableLogic 自动处理逻辑删除
        overrideMapper.delete(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getId, overrideId)
                .eq(AdminUserPermissionOverride::getUserId, userId)
        );
    }

    @Override
    @Transactional
    public void clearUserPermissionOverrides(Long userId) {
        overrideMapper.delete(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getUserId, userId)
        );
    }

    // ==================== 权限检查（安全过滤器依赖） ====================

    @Override
    public Set<Long> getUserPermissionIds(Long userId) {
        AdminUser user = userMapper.selectById(userId);
        if (user == null || user.getIsDeleted() == 1) {
            return Collections.emptySet();
        }

        // 超级管理员拥有所有权限
        if (user.getIsSuperuser() != null && user.getIsSuperuser() == 1) {
            return permissionService.getActivePermissions().stream()
                .map(AdminPermission::getId)
                .collect(Collectors.toSet());
        }

        // 批量获取所有角色权限
        Set<Long> roleIds = getUserRoleIds(userId);
        if (roleIds.isEmpty()) {
            return Collections.emptySet();
        }

        List<AdminRolePermission> allRolePerms = rolePermissionMapper.selectList(
            new LambdaQueryWrapper<AdminRolePermission>()
                .in(AdminRolePermission::getRoleId, roleIds)
                .eq(AdminRolePermission::getIsDeleted, 0)
                .eq(AdminRolePermission::getEffect, "GRANT")
        );

        Set<Long> permissionIds = allRolePerms.stream()
            .map(AdminRolePermission::getPermissionId)
            .collect(Collectors.toSet());

        // 应用用户权限覆盖
        List<AdminUserPermissionOverride> overrides = overrideMapper.selectList(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getUserId, userId)
                .eq(AdminUserPermissionOverride::getIsDeleted, 0)
        );

        for (AdminUserPermissionOverride override : overrides) {
            if ("GRANT".equals(override.getEffect())) {
                permissionIds.add(override.getPermissionId());
            } else {
                permissionIds.remove(override.getPermissionId());
            }
        }

        return permissionIds;
    }

    @Override
    public boolean checkPermission(Long userId, String path, String method) {
        AdminUser user = userMapper.selectById(userId);
        if (user == null || user.getIsDeleted() == 1) {
            return false;
        }

        if (user.getIsSuperuser() != null && user.getIsSuperuser() == 1) {
            return true;
        }

        List<AdminPermission> matchedPerms = permissionService.findMatchingPermissions(path, method);
        if (matchedPerms.isEmpty()) {
            return false;
        }

        // 获取用户覆盖
        List<AdminUserPermissionOverride> overrides = overrideMapper.selectList(
            new LambdaQueryWrapper<AdminUserPermissionOverride>()
                .eq(AdminUserPermissionOverride::getUserId, userId)
                .eq(AdminUserPermissionOverride::getIsDeleted, 0)
        );
        Map<Long, AdminUserPermissionOverride> overrideMap = overrides.stream()
            .collect(Collectors.toMap(AdminUserPermissionOverride::getPermissionId, o -> o, (a, b) -> a));

        // 批量获取角色权限
        Set<Long> roleIds = getUserRoleIds(userId);
        List<AdminRolePermission> allRolePerms = roleIds.isEmpty() ? Collections.emptyList() :
            rolePermissionMapper.selectList(
                new LambdaQueryWrapper<AdminRolePermission>()
                    .in(AdminRolePermission::getRoleId, roleIds)
                    .eq(AdminRolePermission::getIsDeleted, 0)
            );
        Map<Long, AdminRolePermission> rolePermMap = allRolePerms.stream()
            .collect(Collectors.toMap(AdminRolePermission::getPermissionId, rp -> rp, (a, b) -> a));

        List<AdminRolePermission> matchedRolePerms = new ArrayList<>();

        for (AdminPermission perm : matchedPerms) {
            // 先检查覆盖
            AdminUserPermissionOverride override = overrideMap.get(perm.getId());
            if (override != null) {
                return "GRANT".equals(override.getEffect());
            }

            AdminRolePermission rp = rolePermMap.get(perm.getId());
            if (rp != null) {
                matchedRolePerms.add(rp);
            }
        }

        if (matchedRolePerms.isEmpty()) {
            return false;
        }

        matchedRolePerms.sort((a, b) -> {
            if (!a.getPriority().equals(b.getPriority())) {
                return b.getPriority().compareTo(a.getPriority());
            }
            return "DENY".equals(a.getEffect()) ? -1 : 1;
        });

        return "GRANT".equals(matchedRolePerms.get(0).getEffect());
    }

    // ==================== 内部辅助 ====================

    private static class RolePermissionInfo {
        Long roleId;
        String roleName;
        String effect;
        int priority;
    }
}
