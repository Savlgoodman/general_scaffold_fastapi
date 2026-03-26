"""通知公告路由，对应 Java NoticeController。"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.models.user import AdminUser
from app.schemas.notice import CreateNoticeDTO, NoticeVO, UpdateNoticeDTO
from app.security.security_utils import get_current_user
from app.services import notice_service

router = APIRouter(prefix="/api/admin/notices", tags=["notices"])


@router.get("", operation_id="listNotices", summary="公告列表")
async def list_notices(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    type: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[NoticeVO]]:
    page = await notice_service.get_notice_page(db, pageNum, pageSize, keyword, type, status)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getNoticeDetail", summary="公告详情")
async def get_notice_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[NoticeVO]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    notice = await notice_service.get_notice_by_id(db, id)
    if notice is None:
        raise BusinessException(ResultCode.NOT_FOUND, "公告不存在")
    return R.ok(data=NoticeVO(
        id=notice.id, title=notice.title, content=notice.content, type=notice.type,
        status=notice.status, is_top=notice.is_top, publish_time=notice.publish_time,
        publisher_id=notice.publisher_id, publisher_name=notice.publisher_name,
        create_time=notice.create_time, update_time=notice.update_time,
    ))


@router.post("", operation_id="createNotice", summary="创建公告")
async def create_notice(
    dto: CreateNoticeDTO,
    db: AsyncSession = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
) -> R[NoticeVO]:
    notice = await notice_service.create_notice(db, dto, user.id, user.username)
    return R.ok(data=NoticeVO(
        id=notice.id, title=notice.title, content=notice.content, type=notice.type,
        status=notice.status, is_top=notice.is_top, publisher_id=notice.publisher_id,
        publisher_name=notice.publisher_name, create_time=notice.create_time,
    ))


@router.put("/{id}", operation_id="updateNotice", summary="编辑公告")
async def update_notice(id: int, dto: UpdateNoticeDTO, db: AsyncSession = Depends(get_db)) -> R[NoticeVO]:
    notice = await notice_service.update_notice(db, id, dto)
    return R.ok(data=NoticeVO(
        id=notice.id, title=notice.title, content=notice.content, type=notice.type,
        status=notice.status, is_top=notice.is_top, create_time=notice.create_time,
    ))


@router.delete("/{id}", operation_id="deleteNotice", summary="删除公告")
async def delete_notice(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await notice_service.delete_notice(db, id)
    return R.ok()


@router.put("/{id}/publish", operation_id="publishNotice", summary="发布公告")
async def publish_notice(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await notice_service.publish_notice(db, id)
    return R.ok()


@router.put("/{id}/withdraw", operation_id="withdrawNotice", summary="撤回公告")
async def withdraw_notice(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await notice_service.withdraw_notice(db, id)
    return R.ok()


@router.put("/{id}/top", operation_id="toggleNoticeTop", summary="切换置顶")
async def toggle_top(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await notice_service.toggle_top(db, id)
    return R.ok()
