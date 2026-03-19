package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "用户-角色关联")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_user_role")
public class AdminUserRole extends BaseEntity {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "角色ID")
    private Long roleId;
}
