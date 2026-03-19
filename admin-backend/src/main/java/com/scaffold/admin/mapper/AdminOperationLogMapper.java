package com.scaffold.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.scaffold.admin.model.entity.AdminOperationLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminOperationLogMapper extends BaseMapper<AdminOperationLog> {
}
