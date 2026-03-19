package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "角色")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_role")
public class AdminRole extends BaseEntity {

    @Schema(description = "角色名称")
    private String name;

    @Schema(description = "角色编码")
    private String code;

    @Schema(description = "角色描述")
    private String description;

    @Schema(description = "状态（1-正常 0-禁用）")
    private Integer status;

    @Schema(description = "排序")
    private Integer sort;
}
