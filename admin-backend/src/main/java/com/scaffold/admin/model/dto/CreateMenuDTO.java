package com.scaffold.admin.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "创建菜单请求")
public class CreateMenuDTO {

    @NotBlank(message = "菜单名称不能为空")
    @Schema(description = "菜单名称", example = "用户管理")
    private String name;

    @Schema(description = "路由路径", example = "/system/user")
    private String path;

    @Schema(description = "菜单图标", example = "Users")
    private String icon;

    @Schema(description = "前端组件路径", example = "system/UserManagement")
    private String component;

    @Schema(description = "父级ID，0为顶级菜单", example = "0")
    private Long parentId = 0L;

    @NotBlank(message = "菜单类型不能为空")
    @Schema(description = "菜单类型（directory-目录 menu-菜单 button-按钮）", example = "menu")
    private String type;

    @Schema(description = "排序", example = "0")
    private Integer sort = 0;
}
