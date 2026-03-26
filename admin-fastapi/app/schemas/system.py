"""系统配置与系统监控相关 Schema。"""

from __future__ import annotations

from pydantic import Field

from app.schemas.base import CamelModel


# -- DTOs ------------------------------------------------------------------

class SystemConfigUpdateItem(CamelModel):
    config_key: str = Field(..., description="配置键")
    config_value: str | None = Field(None, description="配置值")


class UpdateSystemConfigDTO(CamelModel):
    configs: list[SystemConfigUpdateItem] = Field(
        ..., description="待更新的配置列表"
    )


# -- VOs -------------------------------------------------------------------

class SystemConfigItemVO(CamelModel):
    config_key: str | None = None
    config_value: str | None = None
    description: str | None = None


class SystemConfigGroupVO(CamelModel):
    group_name: str | None = None
    items: list[SystemConfigItemVO] = []


# -- 系统监控 VO -----------------------------------------------------------

class SystemCpuInfo(CamelModel):
    core_count: int | None = None
    user_usage: float | None = None
    system_usage: float | None = None
    idle: float | None = None


class SystemMemoryInfo(CamelModel):
    total: int | None = None
    used: int | None = None
    available: int | None = None
    usage_rate: float | None = None


class SystemDiskInfo(CamelModel):
    mount: str | None = None
    fs_type: str | None = None
    total: int | None = None
    used: int | None = None
    available: int | None = None
    usage_rate: float | None = None


class SystemServerInfo(CamelModel):
    os_name: str | None = None
    os_arch: str | None = None
    host_name: str | None = None
    ip: str | None = None


class SystemInfoVO(CamelModel):
    cpu: SystemCpuInfo | None = None
    memory: SystemMemoryInfo | None = None
    disks: list[SystemDiskInfo] = []
    server: SystemServerInfo | None = None
