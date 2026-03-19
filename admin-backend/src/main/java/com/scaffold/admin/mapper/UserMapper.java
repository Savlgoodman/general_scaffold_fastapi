package com.scaffold.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.scaffold.admin.model.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
