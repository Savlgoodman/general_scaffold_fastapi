package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "角色-权限关联")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_role_permission")
public class AdminRolePermission extends BaseEntity {

    @Schema(description = "角色ID")
    private Long roleId;

    @Schema(description = "权限ID")
    private Long permissionId;
}
