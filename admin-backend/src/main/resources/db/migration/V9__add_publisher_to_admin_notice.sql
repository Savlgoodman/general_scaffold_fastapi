-- V9__add_publisher_to_admin_notice.sql
-- 公告增加发布者字段

ALTER TABLE admin_notice ADD COLUMN IF NOT EXISTS publisher_id BIGINT;
ALTER TABLE admin_notice ADD COLUMN IF NOT EXISTS publisher_name VARCHAR(100);
