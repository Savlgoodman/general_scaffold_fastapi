package com.scaffold.admin.controller;

import com.scaffold.admin.common.R;
import com.scaffold.admin.model.vo.BucketFileVO;
import com.scaffold.admin.model.vo.FileUploadVO;
import com.scaffold.admin.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/files")
@RequiredArgsConstructor
@Tag(name = "files", description = "文件上传与管理")
public class FileController {

    private final FileService fileService;

    @PostMapping("/upload")
    @Operation(operationId = "uploadFile", summary = "通用文件上传", description = "上传文件到MinIO（≤50MB）")
    public R<FileUploadVO> upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "directory", required = false) String directory
    ) {
        return R.ok(fileService.uploadFile(file, directory));
    }

    @PostMapping("/upload/avatar")
    @Operation(operationId = "uploadAvatar", summary = "头像上传", description = "上传头像图片（≤2MB，仅jpg/png/gif/webp）")
    public R<FileUploadVO> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return R.ok(fileService.uploadAvatar(file));
    }

    @DeleteMapping
    @Operation(operationId = "deleteFile", summary = "删除文件", description = "根据对象名删除MinIO中的文件")
    public R<Void> delete(@RequestParam("objectName") String objectName) {
        fileService.deleteFile(objectName);
        return R.ok();
    }

    @GetMapping
    @Operation(operationId = "listFiles", summary = "文件列表", description = "列出指定前缀下的所有文件")
    public R<List<BucketFileVO>> list(@RequestParam(value = "prefix", required = false) String prefix) {
        return R.ok(fileService.listFiles(prefix));
    }

    @GetMapping("/buckets")
    @Operation(operationId = "listBuckets", summary = "桶列表", description = "列出所有MinIO桶")
    public R<List<String>> listBuckets() {
        return R.ok(fileService.listBuckets());
    }
}
