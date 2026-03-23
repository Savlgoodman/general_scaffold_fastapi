package com.scaffold.admin.model.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum OperationType {

    CREATE("新增"),
    UPDATE("修改"),
    DELETE("删除");

    private final String label;
}
