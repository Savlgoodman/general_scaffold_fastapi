package com.scaffold.admin.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "同步角色菜单请求")
public class SyncRoleMenusDTO {

    @NotNull(message = "菜单ID列表不能为空")
    @Schema(description = "选中的菜单ID列表")
    private List<Long> menuIds;
}
