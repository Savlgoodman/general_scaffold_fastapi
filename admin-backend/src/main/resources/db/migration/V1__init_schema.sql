-- V1__init_schema.sql
-- 初始化后台管理表结构

-- 管理员用户表
CREATE TABLE admin_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    avatar VARCHAR(500),
    status INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_user.status IS '1-正常 0-禁用';

-- 角色表
CREATE TABLE admin_role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    status INTEGER DEFAULT 1,
    sort INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE admin_permission (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) DEFAULT 'api',
    method VARCHAR(20),
    path VARCHAR(255),
    description VARCHAR(255),
    parent_id BIGINT DEFAULT 0,
    sort INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_permission.code IS '权限标识，如: system:user:list';
COMMENT ON COLUMN admin_permission.type IS 'api-接口 permission-权限';
COMMENT ON COLUMN admin_permission.method IS 'HTTP方法 GET/POST/PUT/DELETE';

-- 菜单表
CREATE TABLE admin_menu (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    component VARCHAR(255),
    parent_id BIGINT DEFAULT 0,
    type VARCHAR(20) DEFAULT 'menu',
    sort INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_menu.type IS 'directory-目录 menu-菜单 button-按钮';

-- 用户-角色关联表
CREATE TABLE admin_user_role (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色-权限关联表
CREATE TABLE admin_role_permission (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色-菜单关联表
CREATE TABLE admin_role_menu (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户权限覆盖表（per-user grant/deny）
CREATE TABLE admin_user_permission_override (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    effect VARCHAR(10) NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_user_permission_override.effect IS 'GRANT-允许 DENY-拒绝';

-- API请求日志表
CREATE TABLE admin_api_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(50),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    query_params TEXT,
    request_body TEXT,
    response_code INTEGER,
    response_body TEXT,
    duration_ms BIGINT,
    ip VARCHAR(50),
    user_agent VARCHAR(500),
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 登录日志表
CREATE TABLE admin_login_log (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    ip VARCHAR(50),
    user_agent VARCHAR(500),
    message VARCHAR(255),
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_login_log.status IS 'success-成功 failed-失败 locked-锁定';

-- 操作审计日志表
CREATE TABLE admin_operation_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(50),
    module VARCHAR(100),
    operation VARCHAR(50),
    method_name VARCHAR(200),
    request_params TEXT,
    old_data TEXT,
    new_data TEXT,
    ip VARCHAR(50),
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统异常日志表
CREATE TABLE admin_error_log (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    exception_class VARCHAR(255),
    exception_message TEXT,
    stack_trace TEXT,
    request_path VARCHAR(255),
    request_method VARCHAR(10),
    request_params TEXT,
    user_id BIGINT,
    ip VARCHAR(50),
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_error_log.level IS 'WARNING ERROR CRITICAL';

-- 通知公告表
CREATE TABLE admin_notice (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(20) DEFAULT 'notice',
    status VARCHAR(20) DEFAULT 'draft',
    is_top INTEGER DEFAULT 0,
    publish_time TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN admin_notice.type IS 'notice-公告 announcement-通告';
COMMENT ON COLUMN admin_notice.status IS 'draft-草稿 published-已发布 withdrawn-已撤回';

-- 索引
CREATE INDEX idx_admin_user_username ON admin_user(username);
CREATE INDEX idx_admin_user_status ON admin_user(status);
CREATE INDEX idx_admin_user_deleted ON admin_user(is_deleted);
CREATE INDEX idx_admin_role_code ON admin_role(code);
CREATE INDEX idx_admin_role_deleted ON admin_role(is_deleted);
CREATE INDEX idx_admin_permission_code ON admin_permission(code);
CREATE INDEX idx_admin_permission_deleted ON admin_permission(is_deleted);
CREATE INDEX idx_admin_menu_parent ON admin_menu(parent_id);
CREATE INDEX idx_admin_menu_deleted ON admin_menu(is_deleted);
CREATE INDEX idx_admin_user_role_user ON admin_user_role(user_id);
CREATE INDEX idx_admin_user_role_role ON admin_user_role(role_id);
CREATE INDEX idx_admin_role_permission_role ON admin_role_permission(role_id);
CREATE INDEX idx_admin_role_permission_permission ON admin_role_permission(permission_id);
CREATE INDEX idx_admin_api_log_user ON admin_api_log(user_id);
CREATE INDEX idx_admin_api_log_path ON admin_api_log(path);
CREATE INDEX idx_admin_api_log_create_time ON admin_api_log(create_time);
CREATE INDEX idx_admin_login_log_username ON admin_login_log(username);
CREATE INDEX idx_admin_login_log_create_time ON admin_login_log(create_time);
CREATE INDEX idx_admin_operation_log_user ON admin_operation_log(user_id);
CREATE INDEX idx_admin_operation_log_create_time ON admin_operation_log(create_time);
CREATE INDEX idx_admin_error_log_level ON admin_error_log(level);
CREATE INDEX idx_admin_error_log_create_time ON admin_error_log(create_time);
CREATE INDEX idx_admin_notice_status ON admin_notice(status);
CREATE INDEX idx_admin_notice_deleted ON admin_notice(is_deleted);

-- 插入超级管理员角色
INSERT INTO admin_role (name, code, description, status, sort) VALUES ('超级管理员', 'SUPER_ADMIN', '拥有所有权限', 1, 0);

-- 插入默认管理员账号 (密码: admin123 经过BCrypt加密)
INSERT INTO admin_user (username, password, nickname, status) VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', '管理员', 1);
