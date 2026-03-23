package com.scaffold.admin.service;

import com.scaffold.admin.model.vo.SystemInfoVO;
import com.scaffold.admin.model.vo.SystemInfoVO.*;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemMonitorService {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;

    public SystemInfoVO getSystemInfo() {
        SystemInfoVO vo = new SystemInfoVO();
        SystemInfo si = new SystemInfo();
        HardwareAbstractionLayer hal = si.getHardware();
        OperatingSystem os = si.getOperatingSystem();

        vo.setCpu(collectCpu(hal.getProcessor()));
        vo.setMemory(collectMemory(hal.getMemory()));
        vo.setJvm(collectJvm());
        vo.setDisks(collectDisks(os.getFileSystem()));
        vo.setRedis(collectRedis());
        vo.setDbPool(collectDbPool());
        vo.setServer(collectServer(os));

        return vo;
    }

    private SystemCpuInfo collectCpu(CentralProcessor processor) {
        SystemCpuInfo cpu = new SystemCpuInfo();
        cpu.setCoreCount(processor.getLogicalProcessorCount());

        long[] prevTicks = processor.getSystemCpuLoadTicks();
        try { Thread.sleep(500); } catch (InterruptedException ignored) {}

        long[] ticks = processor.getSystemCpuLoadTicks();
        long user = ticks[CentralProcessor.TickType.USER.getIndex()] - prevTicks[CentralProcessor.TickType.USER.getIndex()];
        long system = ticks[CentralProcessor.TickType.SYSTEM.getIndex()] - prevTicks[CentralProcessor.TickType.SYSTEM.getIndex()];
        long idle = ticks[CentralProcessor.TickType.IDLE.getIndex()] - prevTicks[CentralProcessor.TickType.IDLE.getIndex()];
        long total = 0;
        for (int i = 0; i < ticks.length; i++) {
            total += ticks[i] - prevTicks[i];
        }

        cpu.setUserUsage(total > 0 ? round(100.0 * user / total) : 0);
        cpu.setSystemUsage(total > 0 ? round(100.0 * system / total) : 0);
        cpu.setIdle(total > 0 ? round(100.0 * idle / total) : 0);

        return cpu;
    }

    private SystemMemoryInfo collectMemory(GlobalMemory memory) {
        SystemMemoryInfo mem = new SystemMemoryInfo();
        mem.setTotal(memory.getTotal());
        mem.setAvailable(memory.getAvailable());
        mem.setUsed(memory.getTotal() - memory.getAvailable());
        mem.setUsageRate(round(100.0 * mem.getUsed() / mem.getTotal()));
        return mem;
    }

    private SystemJvmInfo collectJvm() {
        SystemJvmInfo jvm = new SystemJvmInfo();
        Runtime rt = Runtime.getRuntime();
        jvm.setMaxMemory(rt.maxMemory());
        jvm.setTotalMemory(rt.totalMemory());
        jvm.setFreeMemory(rt.freeMemory());
        jvm.setUsedMemory(rt.totalMemory() - rt.freeMemory());
        jvm.setUsageRate(round(100.0 * jvm.getUsedMemory() / jvm.getMaxMemory()));
        jvm.setJavaVersion(System.getProperty("java.version"));

        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long days = TimeUnit.MILLISECONDS.toDays(uptimeMs);
        long hours = TimeUnit.MILLISECONDS.toHours(uptimeMs) % 24;
        long minutes = TimeUnit.MILLISECONDS.toMinutes(uptimeMs) % 60;
        jvm.setUptime(days + "天 " + hours + "小时 " + minutes + "分钟");

        return jvm;
    }

    private List<SystemDiskInfo> collectDisks(FileSystem fs) {
        List<SystemDiskInfo> list = new ArrayList<>();
        for (OSFileStore store : fs.getFileStores()) {
            SystemDiskInfo disk = new SystemDiskInfo();
            disk.setMount(store.getMount());
            disk.setFsType(store.getType());
            long total = store.getTotalSpace();
            long usable = store.getUsableSpace();
            disk.setTotal(total);
            disk.setUsed(total - usable);
            disk.setAvailable(usable);
            disk.setUsageRate(total > 0 ? round(100.0 * (total - usable) / total) : 0);
            list.add(disk);
        }
        return list;
    }

    private SystemRedisInfo collectRedis() {
        SystemRedisInfo redis = new SystemRedisInfo();
        try {
            RedisConnection conn = redisTemplate.getConnectionFactory().getConnection();
            Properties info = conn.serverCommands().info();
            conn.close();
            if (info != null) {
                redis.setVersion(info.getProperty("redis_version", "-"));
                redis.setUsedMemory(info.getProperty("used_memory_human", "-"));
                redis.setConnectedClients(info.getProperty("connected_clients", "-"));
                redis.setUptimeDays(info.getProperty("uptime_in_days", "-"));
                redis.setKeyCount(info.getProperty("db0", "-"));
            }
        } catch (Exception e) {
            log.warn("获取Redis信息失败: {}", e.getMessage());
            redis.setVersion("获取失败");
        }
        return redis;
    }

    private SystemDbPoolInfo collectDbPool() {
        SystemDbPoolInfo pool = new SystemDbPoolInfo();
        try {
            if (dataSource instanceof HikariDataSource hikari) {
                HikariPoolMXBean mxBean = hikari.getHikariPoolMXBean();
                if (mxBean != null) {
                    pool.setActiveConnections(mxBean.getActiveConnections());
                    pool.setIdleConnections(mxBean.getIdleConnections());
                    pool.setTotalConnections(mxBean.getTotalConnections());
                    pool.setThreadsAwaitingConnection(mxBean.getThreadsAwaitingConnection());
                }
            }
        } catch (Exception e) {
            log.warn("获取数据库连接池信息失败: {}", e.getMessage());
        }
        return pool;
    }

    private SystemServerInfo collectServer(OperatingSystem os) {
        SystemServerInfo server = new SystemServerInfo();
        server.setOsName(os.toString());
        server.setOsArch(System.getProperty("os.arch"));
        try {
            InetAddress addr = InetAddress.getLocalHost();
            server.setHostName(addr.getHostName());
            server.setIp(addr.getHostAddress());
        } catch (Exception e) {
            server.setHostName("未知");
            server.setIp("未知");
        }
        return server;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
