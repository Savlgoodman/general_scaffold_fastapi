"""系统监控路由，对应 Java SystemController。"""

from fastapi import APIRouter

from app.common.response import R
from app.schemas.system import SystemInfoVO
from app.services import system_monitor_service

router = APIRouter(prefix="/api/admin/system", tags=["system-monitor"])


@router.get("/monitor", operation_id="getSystemInfo", summary="系统监控信息")
async def get_system_info() -> R[SystemInfoVO]:
    info = system_monitor_service.get_system_info()
    return R.ok(data=info)
