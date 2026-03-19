package com.scaffold.admin.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Schema(description = "分页响应封装")
@Data
public class PageResult<T> implements Serializable {

    @Schema(description = "总记录数", example = "100")
    private long total;

    @Schema(description = "当前页数据列表")
    private List<T> records;

    @Schema(description = "当前页码", example = "1")
    private long current;

    @Schema(description = "每页记录数", example = "10")
    private long size;

    public static <T> PageResult<T> of(long total, List<T> records, long current, long size) {
        PageResult<T> result = new PageResult<>();
        result.setTotal(total);
        result.setRecords(records);
        result.setCurrent(current);
        result.setSize(size);
        return result;
    }
}
