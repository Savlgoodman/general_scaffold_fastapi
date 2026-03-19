package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "操作审计日志")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_operation_log")
public class AdminOperationLog extends BaseEntity {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "操作模块")
    private String module;

    @Schema(description = "操作类型")
    private String operation;

    @Schema(description = "方法名")
    private String methodName;

    @Schema(description = "请求参数")
    private String requestParams;

    @Schema(description = "操作前数据")
    private String oldData;

    @Schema(description = "操作后数据")
    private String newData;

    @Schema(description = "IP地址")
    private String ip;
}
