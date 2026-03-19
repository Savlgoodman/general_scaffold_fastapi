package com.scaffold.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.scaffold.admin.model.entity.AdminUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminUserMapper extends BaseMapper<AdminUser> {
}
