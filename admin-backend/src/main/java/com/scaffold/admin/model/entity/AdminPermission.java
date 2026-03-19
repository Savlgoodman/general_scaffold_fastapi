package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "权限")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_permission")
public class AdminPermission extends BaseEntity {

    @Schema(description = "权限名称")
    private String name;

    @Schema(description = "权限标识，如: system:user:list")
    private String code;

    @Schema(description = "权限类型（api-接口 permission-权限）")
    private String type;

    @Schema(description = "HTTP方法 GET/POST/PUT/DELETE")
    private String method;

    @Schema(description = "接口路径")
    private String path;

    @Schema(description = "权限描述")
    private String description;

    @Schema(description = "父级ID")
    private Long parentId;

    @Schema(description = "排序")
    private Integer sort;
}
