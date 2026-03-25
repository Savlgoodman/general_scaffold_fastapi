from fastapi import APIRouter

from app.common.response import R

router = APIRouter(tags=["Health"])


@router.get("/health", operation_id="healthCheck", summary="健康检查")
async def health_check() -> R[str]:
    return R.ok(data="ok")
