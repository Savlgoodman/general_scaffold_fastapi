package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "菜单树形视图")
public class MenuVO {

    @Schema(description = "菜单ID")
    private Long id;

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

    @Schema(description = "子菜单列表")
    private List<MenuVO> children;
}
