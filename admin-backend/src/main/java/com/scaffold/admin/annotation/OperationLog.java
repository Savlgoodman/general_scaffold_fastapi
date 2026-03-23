package com.scaffold.admin.annotation;

import com.scaffold.admin.model.enums.OperationType;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 操作审计日志注解
 * 标注在 Service 实现类的 CUD 方法上，由 OperationLogAspect 切面处理
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface OperationLog {

    /** 操作模块，如 "用户管理"、"角色管理" */
    String module();

    /** 操作类型 */
    OperationType type();

    /** 可选补充描述 */
    String description() default "";
}
