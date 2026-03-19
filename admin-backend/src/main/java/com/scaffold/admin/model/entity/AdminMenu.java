package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "菜单")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_menu")
public class AdminMenu extends BaseEntity {

    @Schema(description = "菜单名称")
    private String name;

    @Schema(description = "路由路径")
    private String path;

    @Schema(description = "菜单图标")
    private String icon;

    @Schema(description = "前端组件路径")
    private String component;

    @Schema(description = "父级ID")
    private Long parentId;

    @Schema(description = "菜单类型（directory-目录 menu-菜单 button-按钮）")
    private String type;

    @Schema(description = "排序")
    private Integer sort;
}
