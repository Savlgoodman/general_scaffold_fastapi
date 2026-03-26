"""菜单管理路由，对应 Java MenuController。"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.response import R
from app.db.session import get_db
from app.decorators.operation_log import log_operation
from app.schemas.auth import MenuVO
from app.schemas.menu import CreateMenuDTO, UpdateMenuDTO, SortMenuDTO
from app.security.security_utils import get_current_user_id
from app.services import menu_service

router = APIRouter(prefix="/api/admin/menus", tags=["menus"])


@router.get("/tree", operation_id="getMenuTree", summary="获取全量菜单树")
async def get_menu_tree(db: AsyncSession = Depends(get_db)) -> R[list[MenuVO]]:
    tree = await menu_service.get_menu_tree(db)
    return R.ok(data=tree)


@router.get("/user-tree", operation_id="getUserMenuTree", summary="获取当前用户菜单树")
async def get_user_menu_tree(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> R[list[MenuVO]]:
    tree = await menu_service.get_user_menu_tree(db, user_id)
    return R.ok(data=tree)


@router.get("/{id}", operation_id="getMenuDetail", summary="菜单详情")
async def get_menu_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[MenuVO]:
    vo = await menu_service.get_menu_by_id(db, id)
    return R.ok(data=vo)


@router.post("", operation_id="createMenu", summary="创建菜单")
async def create_menu(dto: CreateMenuDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await menu_service.create_menu(db, dto)
    log_operation(request, "菜单管理", "CREATE", params=dto)
    return R.ok()


@router.put("/{id}", operation_id="updateMenu", summary="更新菜单")
async def update_menu(id: int, dto: UpdateMenuDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await menu_service.update_menu(db, id, dto)
    log_operation(request, "菜单管理", "UPDATE", params=dto)
    return R.ok()


@router.delete("/{id}", operation_id="deleteMenu", summary="删除菜单")
async def delete_menu(id: int, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await menu_service.delete_menu(db, id)
    log_operation(request, "菜单管理", "DELETE", description=f"id={id}")
    return R.ok()


@router.put("/sort", operation_id="sortMenus", summary="批量排序菜单")
async def sort_menus(dto: SortMenuDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await menu_service.sort_menus(db, dto.items)
    log_operation(request, "菜单管理", "UPDATE", description="批量排序")
    return R.ok()
