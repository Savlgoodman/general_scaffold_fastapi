package com.scaffold.admin.controller;

import com.scaffold.admin.common.R;
import com.scaffold.admin.model.dto.LoginDTO;
import com.scaffold.admin.model.dto.RefreshTokenDTO;
import com.scaffold.admin.model.dto.RegisterDTO;
import com.scaffold.admin.model.vo.CaptchaVO;
import com.scaffold.admin.model.vo.LoginVO;
import com.scaffold.admin.service.AuthService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl.AdminUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 认证控制器：验证码、登录、注册、刷新Token、登出
 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
@Tag(name = "认证模块", description = "登录认证相关接口")
public class AuthController {

    private final AuthService authService;

    /**
     * 获取图形验证码
     */
    @GetMapping("/captcha")
    @Operation(summary = "获取图形验证码", description = "生成并返回验证码图片Base64和key")
    public R<CaptchaVO> getCaptcha() {
        CaptchaVO captchaVO = authService.generateCaptcha();
        return R.ok(captchaVO);
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户名密码+验证码登录，返回Access Token和Refresh Token")
    public R<LoginVO> login(@RequestBody LoginDTO loginDTO) {
        LoginVO loginVO = authService.login(loginDTO);
        return R.ok(loginVO);
    }

    /**
     * 用户注册
     */
    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "注册新用户，自动登录并返回Token")
    public R<LoginVO> register(@RequestBody RegisterDTO registerDTO) {
        LoginVO loginVO = authService.register(registerDTO);
        return R.ok(loginVO);
    }

    /**
     * 刷新Token
     */
    @PostMapping("/refresh")
    @Operation(summary = "刷新Token", description = "使用Refresh Token获取新的Access Token")
    public R<LoginVO> refresh(@RequestBody RefreshTokenDTO refreshTokenDTO) {
        LoginVO loginVO = authService.refreshToken(refreshTokenDTO);
        return R.ok(loginVO);
    }

    /**
     * 登出
     */
    @PostMapping("/logout")
    @Operation(summary = "用户登出", description = "注销当前Token，将Token加入黑名单")
    public R<Void> logout(@RequestHeader("Authorization") String authorization) {
        authService.logout(authorization);
        return R.ok();
    }

    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    @Operation(summary = "获取当前用户信息", description = "获取当前登录用户的信息")
    public R<AdminUserDetails> getCurrentUser(@AuthenticationPrincipal AdminUserDetails userDetails) {
        return R.ok(userDetails);
    }
}
