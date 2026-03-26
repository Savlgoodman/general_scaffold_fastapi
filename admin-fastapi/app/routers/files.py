"""文件管理路由，对应 Java FileController。

注意：MinIO 文件上传/管理功能需要 MinIO 服务可用。当前实现为基础框架，
文件上传使用 run_in_executor 包装 MinIO SDK（不支持 async）。
"""

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.file import FileUploadVO

router = APIRouter(prefix="/api/admin/files", tags=["files"])


@router.post("/upload", operation_id="uploadFile", summary="通用文件上传")
async def upload_file(
    file: UploadFile = File(...),
    category: str | None = Query(None),
) -> R[FileUploadVO]:
    # TODO: Phase 5 完整实现 MinIO 上传
    return R.error(501, "文件上传功能待实现")


@router.post("/upload/avatar", operation_id="uploadAvatar", summary="头像上传")
async def upload_avatar(file: UploadFile = File(...)) -> R[FileUploadVO]:
    # TODO: Phase 5 完整实现
    return R.error(501, "头像上传功能待实现")


@router.get("", operation_id="listFiles", summary="文件列表")
async def list_files(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(20, alias="pageSize"),
    bucket: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    keyword: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R:
    # TODO: 实现文件分页查询
    from app.common.pagination import PageResult
    return R.ok(data=PageResult(total=0, records=[], current=pageNum, size=pageSize))


@router.get("/{id}", operation_id="getFileDetail", summary="文件详情")
async def get_file_detail(id: int, db: AsyncSession = Depends(get_db)) -> R:
    return R.error(501, "待实现")


@router.put("/{id}/recycle", operation_id="recycleFile", summary="移入回收站")
async def recycle_file(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    return R.error(501, "待实现")


@router.put("/{id}/restore", operation_id="restoreFile", summary="恢复文件")
async def restore_file(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    return R.error(501, "待实现")


@router.delete("/{id}", operation_id="deleteFilePermanently", summary="彻底删除")
async def delete_file_permanently(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    return R.error(501, "待实现")


@router.get("/recycle-bin", operation_id="listRecycleBin", summary="回收站列表")
async def list_recycle_bin(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(20, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
) -> R:
    from app.common.pagination import PageResult
    return R.ok(data=PageResult(total=0, records=[], current=pageNum, size=pageSize))


@router.delete("/recycle-bin", operation_id="emptyRecycleBin", summary="清空回收站")
async def empty_recycle_bin(db: AsyncSession = Depends(get_db)) -> R[str]:
    return R.error(501, "待实现")


@router.get("/buckets", operation_id="listBuckets", summary="桶列表")
async def list_buckets() -> R[list[str]]:
    return R.error(501, "待实现")
