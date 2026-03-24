package com.scaffold.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.model.dto.CreateAdminUserDTO;
import com.scaffold.admin.model.dto.UpdateAdminUserDTO;
import com.scaffold.admin.model.entity.AdminUser;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/**
 * 管理员用户服务接口
 */
public interface AdminUserService {

    /**
     * 根据用户名加载用户详情
     */
    UserDetails loadUserByUsername(String username);

    /**
     * 根据用户ID加载用户详情
     */
    UserDetails loadUserById(Long id);

    /**
     * 根据用户ID获取用户实体
     */
    AdminUser getUserById(Long id);

    /**
     * 分页获取用户列表
     */
    Page<AdminUser> getUserPage(Integer pageNum, Integer pageSize, String keyword);

    /**
     * 创建用户
     */
    AdminUser createUser(CreateAdminUserDTO dto);

    /**
     * 更新用户
     */
    AdminUser updateUser(Long id, UpdateAdminUserDTO dto);

    /**
     * 删除用户
     */
    void deleteUser(Long id);

    /**
     * 批量删除用户
     */
    void deleteUsers(List<Long> ids);

    /**
     * 检查用户名是否存在
     */
    boolean isUsernameExists(String username);

    /**
     * 根据用户名获取用户
     */
    AdminUser getUserByUsername(String username);

    /**
     * 更新用户头像
     */
    void updateAvatar(Long userId, String avatarUrl);
}
