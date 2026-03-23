-- V7__init_menus.sql
-- 初始化菜单数据

-- 一级菜单
INSERT INTO admin_menu (name, path, icon, parent_id, type, sort) VALUES
('Dashboard', '/', 'LayoutDashboard', 0, 'menu', 0);

INSERT INTO admin_menu (name, path, icon, parent_id, type, sort) VALUES
('系统管理', '/system', 'Settings', 0, 'directory', 1);

INSERT INTO admin_menu (name, path, icon, parent_id, type, sort) VALUES
('日志监控', '/logs', 'FileText', 0, 'directory', 2);

-- 系统管理子菜单
INSERT INTO admin_menu (name, path, icon, parent_id, type, sort) VALUES
('用户管理', '/system/user', 'Users', (SELECT id FROM admin_menu WHERE path = '/system'), 'menu', 0),
('角色管理', '/system/role', 'Shield', (SELECT id FROM admin_menu WHERE path = '/system'), 'menu', 1),
('菜单管理', '/system/menu', 'Menu', (SELECT id FROM admin_menu WHERE path = '/system'), 'menu', 2),
('权限管理', '/system/permission', 'Key', (SELECT id FROM admin_menu WHERE path = '/system'), 'menu', 3);

-- 日志监控子菜单
INSERT INTO admin_menu (name, path, icon, parent_id, type, sort) VALUES
('API日志', '/logs/api', 'FileText', (SELECT id FROM admin_menu WHERE path = '/logs'), 'menu', 0),
('登录日志', '/logs/login', 'LogIn', (SELECT id FROM admin_menu WHERE path = '/logs'), 'menu', 1),
('操作日志', '/logs/operation', 'FileText', (SELECT id FROM admin_menu WHERE path = '/logs'), 'menu', 2),
('异常日志', '/logs/error', 'AlertCircle', (SELECT id FROM admin_menu WHERE path = '/logs'), 'menu', 3);

-- 将所有菜单关联到超级管理员角色（role_id=1）
INSERT INTO admin_role_menu (role_id, menu_id)
SELECT 1, id FROM admin_menu WHERE is_deleted = 0;
