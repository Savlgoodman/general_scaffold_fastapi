"""系统配置 Service，对应 Java SystemConfigServiceImpl。"""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig
from app.schemas.system import SystemConfigGroupVO, SystemConfigItemVO

# 公开配置白名单（前端无需登录即可获取）
_PUBLIC_CONFIG_KEYS = {
    "site_title",
    "site_name",
    "site_subtitle",
    "site_logo",
    "site_favicon",
    "site_footer",
    "login_bg_image",
    "login_welcome_text",
    "default_theme",
    "login_captcha_enabled",
}


async def list_all_grouped(db: AsyncSession) -> list[SystemConfigGroupVO]:
    """查询所有配置并按 group_name 分组返回。"""
    stmt = (
        select(SystemConfig)
        .where(SystemConfig.is_deleted == 0)
        .order_by(SystemConfig.sort.asc())
    )
    result = await db.execute(stmt)
    configs = result.scalars().all()

    groups: dict[str, list[SystemConfigItemVO]] = defaultdict(list)
    group_order: list[str] = []

    for cfg in configs:
        gn = cfg.group_name or "default"
        if gn not in groups:
            group_order.append(gn)
        groups[gn].append(
            SystemConfigItemVO(
                config_key=cfg.config_key,
                config_value=cfg.config_value,
                description=cfg.description,
            )
        )

    return [
        SystemConfigGroupVO(group_name=gn, items=groups[gn]) for gn in group_order
    ]


async def batch_update(db: AsyncSession, configs: list[dict]) -> None:
    """批量更新配置值。"""
    for item in configs:
        config_key = item.get("config_key")
        config_value = item.get("config_value")
        if config_key is None:
            continue
        stmt = (
            update(SystemConfig)
            .where(SystemConfig.config_key == config_key, SystemConfig.is_deleted == 0)
            .values(config_value=config_value)
        )
        await db.execute(stmt)
    await db.flush()


async def get_public_configs(db: AsyncSession) -> list[SystemConfigItemVO]:
    """获取公开配置项（白名单过滤）。"""
    stmt = (
        select(SystemConfig)
        .where(
            SystemConfig.is_deleted == 0,
            SystemConfig.config_key.in_(_PUBLIC_CONFIG_KEYS),
        )
        .order_by(SystemConfig.sort.asc())
    )
    result = await db.execute(stmt)
    configs = result.scalars().all()

    return [
        SystemConfigItemVO(
            config_key=cfg.config_key,
            config_value=cfg.config_value,
            description=cfg.description,
        )
        for cfg in configs
    ]


async def get_config_value(db: AsyncSession, key: str) -> str | None:
    """根据 key 获取单个配置值。"""
    stmt = select(SystemConfig.config_value).where(
        SystemConfig.config_key == key, SystemConfig.is_deleted == 0
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
