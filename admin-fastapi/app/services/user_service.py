"""用户管理 Service，对应 Java AdminUserServiceImpl。"""

from __future__ import annotations

import bcrypt as _bcrypt
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.pagination import PageResult
from app.common.result_code import ResultCode
from app.models.user import AdminUser
from app.schemas.user import AdminUserVO, CreateAdminUserDTO, UpdateAdminUserDTO


def _hash_password(plain: str) -> str:
    """BCrypt 哈希，与 Java BCryptPasswordEncoder 兼容。"""
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def _to_vo(user: AdminUser) -> AdminUserVO:
    return AdminUserVO(
        id=user.id,
        username=user.username,
        nickname=user.nickname,
        email=user.email,
        phone=user.phone,
        avatar=user.avatar,
        status=user.status,
        is_superuser=user.is_superuser,
        create_time=user.create_time,
        update_time=user.update_time,
    )


async def get_user_page(
    db: AsyncSession,
    page_num: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
) -> PageResult[AdminUserVO]:
    """分页查询用户，支持 username/nickname/email 模糊搜索。"""

    base = select(AdminUser).where(AdminUser.is_deleted == 0)

    if keyword:
        like = f"%{keyword}%"
        base = base.where(
            or_(
                AdminUser.username.ilike(like),
                AdminUser.nickname.ilike(like),
                AdminUser.email.ilike(like),
            )
        )

    # total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # records
    query = base.order_by(AdminUser.create_time.desc()).offset(
        (page_num - 1) * page_size
    ).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return PageResult(
        total=total,
        records=[_to_vo(u) for u in users],
        current=page_num,
        size=page_size,
    )


async def get_user_by_id(db: AsyncSession, user_id: int) -> AdminUser | None:
    """根据 ID 获取用户（未逻辑删除）。"""
    stmt = select(AdminUser).where(AdminUser.id == user_id, AdminUser.is_deleted == 0)
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_user(db: AsyncSession, dto: CreateAdminUserDTO) -> AdminUser:
    """创建用户，检查用户名唯一性。"""
    # 检查用户名是否已存在（部分唯一索引仅约束 is_deleted=0）
    exists_stmt = select(func.count()).where(
        AdminUser.username == dto.username, AdminUser.is_deleted == 0
    )
    count = (await db.execute(exists_stmt)).scalar_one()
    if count > 0:
        raise BusinessException(ResultCode.PARAM_ERROR, "用户名已存在")

    user = AdminUser(
        username=dto.username,
        password=_hash_password(dto.password),
        nickname=dto.nickname,
        email=dto.email,
        phone=dto.phone,
        avatar=dto.avatar,
        is_superuser=dto.is_superuser if dto.is_superuser is not None else 0,
        status=dto.status if dto.status is not None else 1,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession, user_id: int, dto: UpdateAdminUserDTO
) -> AdminUser:
    """更新用户，仅更新非 None 字段。"""
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")

    if dto.nickname is not None:
        user.nickname = dto.nickname
    if dto.email is not None:
        user.email = dto.email
    if dto.phone is not None:
        user.phone = dto.phone
    if dto.avatar is not None:
        user.avatar = dto.avatar
    if dto.is_superuser is not None:
        user.is_superuser = dto.is_superuser
    if dto.status is not None:
        user.status = dto.status
    if dto.password is not None and dto.password.strip():
        user.password = _hash_password(dto.password)

    await db.flush()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: int) -> None:
    """逻辑删除用户。"""
    stmt = (
        update(AdminUser)
        .where(AdminUser.id == user_id, AdminUser.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.execute(stmt)
    await db.flush()


async def delete_users_batch(db: AsyncSession, ids: list[int]) -> None:
    """批量逻辑删除用户。"""
    if not ids:
        return
    stmt = (
        update(AdminUser)
        .where(AdminUser.id.in_(ids), AdminUser.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.execute(stmt)
    await db.flush()
