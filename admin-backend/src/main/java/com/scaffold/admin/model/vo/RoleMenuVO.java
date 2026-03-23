package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "角色菜单分配视图")
public class RoleMenuVO {

    @Schema(description = "角色ID")
    private Long roleId;

    @Schema(description = "角色名称")
    private String roleName;

    @Schema(description = "菜单分组列表")
    private List<RoleMenuVOGroup> groups;

    @Schema(description = "统计摘要")
    private RoleMenuVOSummary summary;

    @Data
    @Schema(description = "菜单分组（顶级菜单/目录）")
    public static class RoleMenuVOGroup {

        @Schema(description = "菜单ID")
        private Long id;

        @Schema(description = "菜单名称")
        private String name;

        @Schema(description = "路由路径")
        private String path;

        @Schema(description = "图标")
        private String icon;

        @Schema(description = "菜单类型")
        private String type;

        @Schema(description = "是否已分配给角色")
        private boolean assigned;

        @Schema(description = "子菜单列表")
        private List<RoleMenuVOItem> children;

        @Schema(description = "已分配子菜单数")
        private int assignedCount;

        @Schema(description = "总子菜单数")
        private int totalCount;
    }

    @Data
    @Schema(description = "子菜单项")
    public static class RoleMenuVOItem {

        @Schema(description = "菜单ID")
        private Long id;

        @Schema(description = "菜单名称")
        private String name;

        @Schema(description = "路由路径")
        private String path;

        @Schema(description = "图标")
        private String icon;

        @Schema(description = "菜单类型")
        private String type;

        @Schema(description = "是否已分配给角色")
        private boolean assigned;

        @Schema(description = "是否被目录覆盖")
        private boolean coveredByDirectory;
    }

    @Data
    @Schema(description = "统计摘要")
    public static class RoleMenuVOSummary {

        @Schema(description = "总菜单数")
        private int totalMenus;

        @Schema(description = "已分配菜单数")
        private int assignedCount;
    }
}
