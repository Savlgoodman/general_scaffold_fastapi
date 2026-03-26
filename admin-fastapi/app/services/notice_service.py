"""通知公告 Service，对应 Java AdminNoticeServiceImpl。"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.pagination import PageResult
from app.common.result_code import ResultCode
from app.models.notice import AdminNotice
from app.schemas.notice import NoticeVO


def _to_vo(notice: AdminNotice) -> NoticeVO:
    return NoticeVO(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        type=notice.type,
        status=notice.status,
        is_top=notice.is_top,
        publish_time=notice.publish_time,
        publisher_id=notice.publisher_id,
        publisher_name=notice.publisher_name,
        create_time=notice.create_time,
        update_time=notice.update_time,
    )


async def get_notice_page(
    db: AsyncSession,
    page_num: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
    type: str | None = None,
    status: str | None = None,
) -> PageResult[NoticeVO]:
    """分页查询��知公告。"""

    base = select(AdminNotice).where(AdminNotice.is_deleted == 0)

    if keyword:
        base = base.where(AdminNotice.title.ilike(f"%{keyword}%"))
    if type:
        base = base.where(AdminNotice.type == type)
    if status:
        base = base.where(AdminNotice.status == status)

    # total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # records: is_top DESC, publish_time DESC NULLS LAST, create_time DESC
    query = (
        base.order_by(
            AdminNotice.is_top.desc(),
            AdminNotice.publish_time.desc().nulls_last(),
            AdminNotice.create_time.desc(),
        )
        .offset((page_num - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    notices = result.scalars().all()

    return PageResult(
        total=total,
        records=[_to_vo(n) for n in notices],
        current=page_num,
        size=page_size,
    )


async def get_notice_by_id(db: AsyncSession, notice_id: int) -> AdminNotice | None:
    """根据 ID 获取通知公告（未逻辑删除）。"""
    stmt = select(AdminNotice).where(
        AdminNotice.id == notice_id, AdminNotice.is_deleted == 0
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_notice(
    db: AsyncSession,
    dto,
    publisher_id: int,
    publisher_name: str,
) -> AdminNotice:
    """创建通知公告，默认 status=draft, type=notice。"""
    notice = AdminNotice(
        title=dto.title,
        content=dto.content,
        type=dto.type or "notice",
        status="draft",
        is_top=0,
        publisher_id=publisher_id,
        publisher_name=publisher_name,
    )
    db.add(notice)
    await db.flush()
    await db.refresh(notice)
    return notice


async def update_notice(db: AsyncSession, notice_id: int, dto) -> AdminNotice:
    """更新通知公告，仅草稿状态允许编辑。"""
    notice = await get_notice_by_id(db, notice_id)
    if notice is None:
        raise BusinessException(ResultCode.NOT_FOUND, "公告不存在")
    if notice.status != "draft":
        raise BusinessException(ResultCode.PARAM_ERROR, "仅草稿状态的公告可以编辑")

    if dto.title is not None:
        notice.title = dto.title
    if dto.content is not None:
        notice.content = dto.content
    if dto.type is not None:
        notice.type = dto.type

    await db.flush()
    await db.refresh(notice)
    return notice


async def delete_notice(db: AsyncSession, notice_id: int) -> None:
    """逻辑删除通知公告。"""
    stmt = (
        update(AdminNotice)
        .where(AdminNotice.id == notice_id, AdminNotice.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.execute(stmt)
    await db.flush()


async def publish_notice(db: AsyncSession, notice_id: int) -> None:
    """发布通知公告。"""
    notice = await get_notice_by_id(db, notice_id)
    if notice is None:
        raise BusinessException(ResultCode.NOT_FOUND, "公告不存在")

    notice.status = "published"
    notice.publish_time = datetime.now(timezone.utc)
    await db.flush()


async def withdraw_notice(db: AsyncSession, notice_id: int) -> None:
    """撤回通知公告。"""
    notice = await get_notice_by_id(db, notice_id)
    if notice is None:
        raise BusinessException(ResultCode.NOT_FOUND, "公告不存在")

    notice.status = "withdrawn"
    await db.flush()


async def toggle_top(db: AsyncSession, notice_id: int) -> None:
    """切换置顶状态。"""
    notice = await get_notice_by_id(db, notice_id)
    if notice is None:
        raise BusinessException(ResultCode.NOT_FOUND, "公告不存在")

    notice.is_top = 0 if notice.is_top == 1 else 1
    await db.flush()
