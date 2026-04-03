package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.mapper.AdminFileMapper;
import com.scaffold.admin.mapper.AdminUserMapper;
import com.scaffold.admin.mapper.AdminUserRoleMapper;
import com.scaffold.admin.mapper.AdminUserPermissionOverrideMapper;
import com.scaffold.admin.model.entity.AdminFile;
import com.scaffold.admin.model.entity.AdminUserRole;
import com.scaffold.admin.model.entity.AdminUserPermissionOverride;
import com.scaffold.admin.model.dto.CreateAdminUserDTO;
import com.scaffold.admin.model.dto.UpdateAdminUserDTO;
import com.scaffold.admin.model.entity.AdminUser;
import com.scaffold.admin.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * 管理员用户服务实现
 */
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final AdminUserMapper adminUserMapper;
    private final AdminFileMapper adminFileMapper;
    private final AdminUserRoleMapper userRoleMapper;
    private final AdminUserPermissionOverrideMapper overrideMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AdminUser user = adminUserMapper.selectOne(
            new LambdaQueryWrapper<AdminUser>()
                .eq(AdminUser::getUsername, username)
                .eq(AdminUser::getIsDeleted, 0)
        );

        if (user == null) {
            throw new UsernameNotFoundException("用户不存在: " + username);
        }

        return new AdminUserDetails(user, Collections.emptyList());
    }

    @Override
    public UserDetails loadUserById(Long id) {
        AdminUser user = adminUserMapper.selectById(id);
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在, ID: " + id);
        }
        return new AdminUserDetails(user, Collections.emptyList());
    }

    @Override
    public AdminUser getUserById(Long id) {
        return adminUserMapper.selectById(id);
    }

    @Override
    public Page<AdminUser> getUserPage(Integer pageNum, Integer pageSize, String keyword) {
        Page<AdminUser> page = new Page<>(pageNum, pageSize);

        LambdaQueryWrapper<AdminUser> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(AdminUser::getIsDeleted, 0)
            .orderByDesc(AdminUser::getCreateTime);

        if (keyword != null && !keyword.isBlank()) {
            queryWrapper.and(w -> w
                .like(AdminUser::getUsername, keyword)
                .or()
                .like(AdminUser::getNickname, keyword)
                .or()
                .like(AdminUser::getEmail, keyword)
            );
        }

        return adminUserMapper.selectPage(page, queryWrapper);
    }

    @Override
    @Transactional
    @OperationLog(module = "用户管理", type = OperationType.CREATE)
    public AdminUser createUser(CreateAdminUserDTO dto) {
        // 检查用户名是否存在
        if (isUsernameExists(dto.getUsername())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名已存在");
        }

        AdminUser user = new AdminUser();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setNickname(dto.getNickname());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setAvatar(dto.getAvatar());
        user.setIsSuperuser(dto.getIsSuperuser() != null ? dto.getIsSuperuser() : 0);
        user.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);

        adminUserMapper.insert(user);
        return user;
    }

    @Override
    @Transactional
    @OperationLog(module = "用户管理", type = OperationType.UPDATE)
    public AdminUser updateUser(Long id, UpdateAdminUserDTO dto) {
        AdminUser user = adminUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }

        if (dto.getNickname() != null) {
            user.setNickname(dto.getNickname());
        }
        if (dto.getEmail() != null) {
            user.setEmail(dto.getEmail());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone());
        }
        if (dto.getAvatar() != null) {
            user.setAvatar(dto.getAvatar());
        }
        if (dto.getIsSuperuser() != null) {
            user.setIsSuperuser(dto.getIsSuperuser());
        }
        if (dto.getStatus() != null) {
            user.setStatus(dto.getStatus());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        adminUserMapper.updateById(user);
        return user;
    }

    @Override
    @Transactional
    @OperationLog(module = "用户管理", type = OperationType.DELETE)
    public void deleteUser(Long id) {
        AdminUser user = adminUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        cleanupUserAssociations(id);
        adminUserMapper.deleteById(id);
    }

    @Override
    @Transactional
    @OperationLog(module = "用户管理", type = OperationType.DELETE, description = "批量删除")
    public void deleteUsers(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        ids.forEach(this::cleanupUserAssociations);
        adminUserMapper.deleteBatchIds(ids);
    }

    /** 删除用户时级联清理：用户-角色、用户权限覆盖 */
    private void cleanupUserAssociations(Long userId) {
        userRoleMapper.delete(
            new LambdaQueryWrapper<AdminUserRole>().eq(AdminUserRole::getUserId, userId)
        );
        overrideMapper.delete(
            new LambdaQueryWrapper<AdminUserPermissionOverride>().eq(AdminUserPermissionOverride::getUserId, userId)
        );
    }

    @Override
    public boolean isUsernameExists(String username) {
        Long count = adminUserMapper.selectCount(
            new LambdaQueryWrapper<AdminUser>()
                .eq(AdminUser::getUsername, username)
                .eq(AdminUser::getIsDeleted, 0)
        );
        return count != null && count > 0;
    }

    @Override
    public AdminUser getUserByUsername(String username) {
        return adminUserMapper.selectOne(
            new LambdaQueryWrapper<AdminUser>()
                .eq(AdminUser::getUsername, username)
                .eq(AdminUser::getIsDeleted, 0)
        );
    }

    @Override
    public void updateAvatar(Long userId, String avatarUrl) {
        AdminUser user = adminUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        // 标记旧头像为回收
        String oldAvatar = user.getAvatar();
        if (oldAvatar != null && !oldAvatar.isBlank()) {
            List<AdminFile> oldFiles = adminFileMapper.selectList(
                new LambdaQueryWrapper<AdminFile>()
                    .eq(AdminFile::getUrl, oldAvatar)
                    .eq(AdminFile::getStatus, "active")
            );
            for (AdminFile f : oldFiles) {
                f.setStatus("recycled");
                f.setDeletedAt(java.time.LocalDateTime.now());
                adminFileMapper.updateById(f);
            }
        }
        user.setAvatar(avatarUrl);
        adminUserMapper.updateById(user);
    }

    /**
     * 管理员用户详情
     */
    public static class AdminUserDetails implements UserDetails {

        private final Long id;
        private final String username;
        private final String password;
        private final String nickname;
        private final Integer status;
        private final Integer isSuperuser;
        private final Collection<? extends GrantedAuthority> authorities;

        public AdminUserDetails(AdminUser user, Collection<? extends GrantedAuthority> authorities) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.password = user.getPassword();
            this.nickname = user.getNickname();
            this.status = user.getStatus();
            this.isSuperuser = user.getIsSuperuser();
            this.authorities = authorities;
        }

        public Long getId() {
            return id;
        }

        public String getNickname() {
            return nickname;
        }

        public Integer getIsSuperuser() {
            return isSuperuser;
        }

        @Override
        public Collection<? extends GrantedAuthority> getAuthorities() {
            return authorities;
        }

        @Override
        public String getPassword() {
            return password;
        }

        @Override
        public String getUsername() {
            return username;
        }

        @Override
        public boolean isAccountNonExpired() {
            return true;
        }

        @Override
        public boolean isAccountNonLocked() {
            return true;
        }

        @Override
        public boolean isCredentialsNonExpired() {
            return true;
        }

        @Override
        public boolean isEnabled() {
            return status != null && status == 1;
        }
    }
}
