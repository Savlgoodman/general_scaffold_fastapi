package com.scaffold.admin.service;

import com.scaffold.admin.model.dto.SyncRolePermissionsDTO;
import com.scaffold.admin.model.dto.SyncUserOverridesDTO;
import com.scaffold.admin.model.entity.AdminRole;
import com.scaffold.admin.model.vo.RolePermissionFullVO;
import com.scaffold.admin.model.vo.UserPermissionOverviewVO;

import java.util.List;
import java.util.Set;

public interface RBACService {

    // ==================== 用户-角色关联 ====================

    List<AdminRole> getUserRoles(Long userId);

    Set<Long> getUserRoleIds(Long userId);

    Set<String> getUserRoleCodes(Long userId);

    boolean hasRole(Long userId, String roleCode);

    void assignUserRoles(Long userId, List<Long> roleIds);

    void removeUserRoles(Long userId, List<Long> roleIds);

    void syncUserRoles(Long userId, List<Long> roleIds);

    // ==================== 角色权限管理 ====================

    /**
     * 获取角色权限完整视图（所有权限+分配状态+组覆盖标记）
     */
    RolePermissionFullVO getRolePermissionsFull(Long roleId);

    /**
     * 原子同步角色权限（比差异，批量增删改）
     */
    void syncRolePermissions(Long roleId, SyncRolePermissionsDTO dto);

// ==================== 用户权限覆盖 ====================

    /**
     * 获取用户权限总览（所有权限+来源+覆盖状态，一次调用包含所有信息）
     */
    UserPermissionOverviewVO getUserPermissionOverview(Long userId);

    /**
     * 同步用户权限覆盖（对比差异，批量增删改）
     */
    void syncUserOverrides(Long userId, SyncUserOverridesDTO dto);

    /**
     * 删除单个覆盖
     */
    void removeUserPermissionOverride(Long userId, Long overrideId);

    /**
     * 清空用户所有覆盖
     */
    void clearUserPermissionOverrides(Long userId);

    // ==================== 权限检查（安全过滤器依赖） ====================

    Set<Long> getUserPermissionIds(Long userId);

    boolean checkPermission(Long userId, String path, String method);
}
