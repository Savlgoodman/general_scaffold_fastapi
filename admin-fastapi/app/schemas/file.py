"""文件管理相关 Schema。"""

from __future__ import annotations

from app.schemas.base import CamelModel


class FileUploadVO(CamelModel):
    url: str | None = None
    object_name: str | None = None
    file_name: str | None = None
    size: int | None = None
