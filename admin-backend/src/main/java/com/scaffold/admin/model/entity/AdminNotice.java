package com.scaffold.admin.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.scaffold.admin.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Schema(description = "通知公告")
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("admin_notice")
public class AdminNotice extends BaseEntity {

    @Schema(description = "公告标题")
    private String title;

    @Schema(description = "公告内容")
    private String content;

    @Schema(description = "公告类型（notice-公告 announcement-通告）")
    private String type;

    @Schema(description = "状态（draft-草稿 published-已发布 withdrawn-已撤回）")
    private String status;

    @Schema(description = "是否置顶")
    private Integer isTop;

    @Schema(description = "发布时间")
    private LocalDateTime publishTime;
}
