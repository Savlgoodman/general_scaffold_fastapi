package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.mapper.AdminRoleMapper;
import com.scaffold.admin.mapper.AdminUserRoleMapper;
import com.scaffold.admin.mapper.AdminRolePermissionMapper;
import com.scaffold.admin.mapper.AdminRoleMenuMapper;
import com.scaffold.admin.model.entity.AdminUserRole;
import com.scaffold.admin.model.entity.AdminRolePermission;
import com.scaffold.admin.model.entity.AdminRoleMenu;
import com.scaffold.admin.model.dto.CreateRoleDTO;
import com.scaffold.admin.model.dto.UpdateRoleDTO;
import com.scaffold.admin.model.entity.AdminRole;
import com.scaffold.admin.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final AdminRoleMapper roleMapper;
    private final AdminUserRoleMapper userRoleMapper;
    private final AdminRolePermissionMapper rolePermissionMapper;
    private final AdminRoleMenuMapper roleMenuMapper;

    @Override
    public AdminRole getById(Long id) {
        return roleMapper.selectById(id);
    }

    @Override
    public AdminRole getByCode(String code) {
        return roleMapper.selectOne(
            new LambdaQueryWrapper<AdminRole>()
                .eq(AdminRole::getCode, code)
                .eq(AdminRole::getIsDeleted, 0)
        );
    }

    @Override
    public List<AdminRole> getAll() {
        return roleMapper.selectList(
            new LambdaQueryWrapper<AdminRole>()
                .eq(AdminRole::getIsDeleted, 0)
                .orderByAsc(AdminRole::getSort)
        );
    }

    @Override
    public List<AdminRole> getActiveRoles() {
        return roleMapper.selectList(
            new LambdaQueryWrapper<AdminRole>()
                .eq(AdminRole::getIsDeleted, 0)
                .eq(AdminRole::getStatus, 1)
                .orderByAsc(AdminRole::getSort)
        );
    }

    @Override
    @Transactional
    @OperationLog(module = "角色管理", type = OperationType.CREATE)
    public AdminRole createRole(CreateRoleDTO dto) {
        if (isCodeExists(dto.getCode())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "角色编码已存在");
        }

        AdminRole role = new AdminRole();
        role.setName(dto.getName());
        role.setCode(dto.getCode());
        role.setDescription(dto.getDescription());
        role.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);
        role.setSort(dto.getSort() != null ? dto.getSort() : 0);

        roleMapper.insert(role);
        return role;
    }

    @Override
    @Transactional
    @OperationLog(module = "角色管理", type = OperationType.UPDATE)
    public AdminRole updateRole(Long id, UpdateRoleDTO dto) {
        AdminRole role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在");
        }

        if (dto.getName() != null) role.setName(dto.getName());
        if (dto.getDescription() != null) role.setDescription(dto.getDescription());
        if (dto.getStatus() != null) role.setStatus(dto.getStatus());
        if (dto.getSort() != null) role.setSort(dto.getSort());

        roleMapper.updateById(role);
        return role;
    }

    @Override
    @Transactional
    @OperationLog(module = "角色管理", type = OperationType.DELETE)
    public void deleteRole(Long id) {
        AdminRole role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在");
        }
        // 级联清理关联表
        cleanupRoleAssociations(id);
        roleMapper.deleteById(id);
    }

    @Override
    @Transactional
    @OperationLog(module = "角色管理", type = OperationType.DELETE, description = "批量删除")
    public void deleteRoles(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        ids.forEach(this::cleanupRoleAssociations);
        roleMapper.deleteBatchIds(ids);
    }

    /**
     * 删除角色时级联清理：用户-角色、角色-权限、角色-菜单关联
     */
    private void cleanupRoleAssociations(Long roleId) {
        userRoleMapper.delete(
            new LambdaQueryWrapper<AdminUserRole>().eq(AdminUserRole::getRoleId, roleId)
        );
        rolePermissionMapper.delete(
            new LambdaQueryWrapper<AdminRolePermission>().eq(AdminRolePermission::getRoleId, roleId)
        );
        roleMenuMapper.delete(
            new LambdaQueryWrapper<AdminRoleMenu>().eq(AdminRoleMenu::getRoleId, roleId)
        );
    }

    @Override
    public boolean isCodeExists(String code) {
        Long count = roleMapper.selectCount(
            new LambdaQueryWrapper<AdminRole>()
                .eq(AdminRole::getCode, code)
                .eq(AdminRole::getIsDeleted, 0)
        );
        return count != null && count > 0;
    }
}
