package com.scaffold.admin.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "用户信息")
public class UserVO {

    @Schema(description = "用户ID")
    private Long id;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "邮箱")
    private String email;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "头像")
    private String avatar;

    @Schema(description = "状态：1-正常 0-禁用")
    private Integer status;

    @Schema(description = "是否超级管理员：1-是 0-否")
    private Integer isSuperuser;

    @Schema(description = "创建时间")
    private LocalDateTime createTime;
}
