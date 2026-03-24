-- V11__remove_session_timeout_config.sql
-- 移除 session_timeout 配置项（与 JWT TTL + 在线会话机制耦合，不适合界面调整）

DELETE FROM admin_system_config WHERE config_key = 'session_timeout';
