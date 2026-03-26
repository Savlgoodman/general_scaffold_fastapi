"""系统监控 Service，收集 CPU/内存/磁盘/服务器信息。"""

from __future__ import annotations

import platform
import socket

import psutil

from app.schemas.system import (
    SystemCpuInfo,
    SystemDiskInfo,
    SystemInfoVO,
    SystemMemoryInfo,
    SystemServerInfo,
)


def get_system_info() -> SystemInfoVO:
    """采集系统运行信息（同步方法，CPU 采样需 ~0.5s）。"""

    # -- CPU ----------------------------------------------------------------
    cpu_percent = psutil.cpu_percent(interval=0.5, percpu=False)
    cpu_times = psutil.cpu_times_percent(interval=0)
    cpu = SystemCpuInfo(
        core_count=psutil.cpu_count(logical=True),
        user_usage=round(cpu_times.user, 1),
        system_usage=round(cpu_times.system, 1),
        idle=round(cpu_times.idle, 1),
    )

    # -- Memory -------------------------------------------------------------
    mem = psutil.virtual_memory()
    memory = SystemMemoryInfo(
        total=mem.total,
        used=mem.used,
        available=mem.available,
        usage_rate=round(mem.percent, 1),
    )

    # -- Disks --------------------------------------------------------------
    disks: list[SystemDiskInfo] = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except PermissionError:
            continue
        disks.append(
            SystemDiskInfo(
                mount=part.mountpoint,
                fs_type=part.fstype,
                total=usage.total,
                used=usage.used,
                available=usage.free,
                usage_rate=round(usage.percent, 1),
            )
        )

    # -- Server -------------------------------------------------------------
    try:
        host_ip = socket.gethostbyname(socket.gethostname())
    except socket.gaierror:
        host_ip = "127.0.0.1"

    server = SystemServerInfo(
        os_name=platform.system(),
        os_arch=platform.machine(),
        host_name=socket.gethostname(),
        ip=host_ip,
    )

    return SystemInfoVO(cpu=cpu, memory=memory, disks=disks, server=server)
