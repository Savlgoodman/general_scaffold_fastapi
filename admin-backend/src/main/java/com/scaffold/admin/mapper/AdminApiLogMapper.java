package com.scaffold.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.model.entity.AdminApiLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AdminApiLogMapper extends BaseMapper<AdminApiLog> {

    /**
     * 分页查询 API 日志，联查 admin_permission 表获取 API 名称
     */
    Page<AdminApiLog> selectPageWithApiName(
        Page<AdminApiLog> page,
        @Param("keyword") String keyword,
        @Param("method") String method,
        @Param("startTime") String startTime,
        @Param("endTime") String endTime
    );

    /**
     * 查询单条 API 日志详情，联查权限名称
     */
    AdminApiLog selectByIdWithApiName(@Param("id") Long id);
}
