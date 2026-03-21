-- V5__add_missing_update_time.sql
-- 为软删除表添加缺失的 update_time 字段

ALTER TABLE admin_role_permission ADD COLUMN update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_user_role ADD COLUMN update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_role_menu ADD COLUMN update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_user_permission_override ADD COLUMN update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
