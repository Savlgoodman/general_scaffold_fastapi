package com.scaffold.admin.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "菜单排序请求")
public class SortMenuDTO {

    @NotNull(message = "排序列表不能为空")
    @Schema(description = "排序项列表")
    private List<SortMenuDTOItem> items;

    @Data
    @Schema(description = "排序项")
    public static class SortMenuDTOItem {

        @NotNull(message = "菜单ID不能为空")
        @Schema(description = "菜单ID")
        private Long id;

        @NotNull(message = "排序值不能为空")
        @Schema(description = "排序值")
        private Integer sort;
    }
}
