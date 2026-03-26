"""系统配置路由，对应 Java SystemConfigController。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.response import R
from app.db.session import get_db
from app.schemas.system import SystemConfigGroupVO, SystemConfigItemVO, UpdateSystemConfigDTO
from app.services import system_config_service

router = APIRouter(prefix="/api/admin/system-config", tags=["system-config"])


@router.get("", operation_id="listSystemConfigs", summary="查询所有配置")
async def list_system_configs(db: AsyncSession = Depends(get_db)) -> R[list[SystemConfigGroupVO]]:
    groups = await system_config_service.list_all_grouped(db)
    return R.ok(data=groups)


@router.put("", operation_id="updateSystemConfigs", summary="批量更新配置")
async def update_system_configs(dto: UpdateSystemConfigDTO, db: AsyncSession = Depends(get_db)) -> R[None]:
    await system_config_service.batch_update(db, [c.model_dump() for c in dto.configs])
    return R.ok()


@router.get("/public", operation_id="getPublicConfigs", summary="获取公开配置")
async def get_public_configs(db: AsyncSession = Depends(get_db)) -> R[list[SystemConfigItemVO]]:
    configs = await system_config_service.get_public_configs(db)
    return R.ok(data=configs)
