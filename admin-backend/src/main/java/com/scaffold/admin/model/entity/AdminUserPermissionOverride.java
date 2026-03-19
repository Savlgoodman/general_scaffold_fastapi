package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "用户权限覆盖")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_user_permission_override")
public class AdminUserPermissionOverride extends BaseEntity {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "权限ID")
    private Long permissionId;

    @Schema(description = "生效方式（GRANT-允许 DENY-拒绝）")
    private String effect;
}
