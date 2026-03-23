package com.scaffold.admin.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "更新菜单请求")
public class UpdateMenuDTO {

    @Schema(description = "菜单名称", example = "用户管理")
    private String name;

    @Schema(description = "路由路径", example = "/system/user")
    private String path;

    @Schema(description = "菜单图标", example = "Users")
    private String icon;

    @Schema(description = "前端组件路径", example = "system/UserManagement")
    private String component;

    @Schema(description = "父级ID", example = "0")
    private Long parentId;

    @Schema(description = "菜单类型（directory-目录 menu-菜单 button-按钮）", example = "menu")
    private String type;

    @Schema(description = "排序", example = "0")
    private Integer sort;
}
