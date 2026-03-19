# Admin Backend

管理平台后端服务，基于 Spring Boot + MyBatis Plus。

## 技术栈

- **Spring Boot 3.3.0** - 核心框架
- **MyBatis Plus 3.5.6** - ORM 持久层框架
- **Spring Security** - 安全认证
- **H2 Database** - 内存数据库（开发环境）

## 包结构说明

```
com.scaffold.admin
├── AdminApplication.java          # 应用启动类
│
├── config/                         # 配置层
│   ├── CorsConfig.java            # 跨域配置
│   ├── SecurityConfig.java         # Spring Security 配置
│   └── MyBatisPlusConfig.java     # MyBatis Plus 分页插件配置
│
├── controller/                    # 控制层（待扩展）
│   └── # REST API 控制器
│
├── service/                       # 业务层（待扩展）
│   └── # 业务逻辑接口及实现
│
├── mapper/                        # 持久层
│   └── UserMapper.java            # 用户 Mapper，继承 BaseMapper
│
├── model/                         # 数据模型层
│   ├── User.java                  # 数据库实体（对应表结构）
│   └── vo/                        # 视图对象
│       └── UserVO.java            # 用户视图对象（API 返回给前端的数据）
│
└── exception/                     # 异常处理（待扩展）
    └── # 自定义异常类
```

## 常用命令

```bash
# 启动应用
mvn spring-boot:run

# 打包
mvn clean package

# 运行测试
mvn test

# 运行单个测试类
mvn test -D test=UserMapperTest
```

## 接口规范

- 基础路径：`/api`
- 认证接口：`/api/public/**`（无需认证）
- 受保护接口：`/api/**`（需要认证）

## 数据库

- H2 控制台：`http://localhost:8080/h2-console`
- JDBC URL：`jdbc:h2:mem:admin_db`
