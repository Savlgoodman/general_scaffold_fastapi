# MinIO 对象存储集成 — 文件上传与桶管理

> 创建日期：2026-03-24
> 最后更新：2026-03-24
> 影响范围：后端（新增 MinIO 配置、文件 Service/Controller）、前端（个人中心页、头像上传、桶管理页）

## 一、现状

| 组件 | 状态 | 说明 |
|------|------|------|
| MinIO 服务 | ✅ 已部署 | 外部服务，需配置连接信息 |
| MinIO SDK | ❌ 缺失 | pom.xml 无依赖 |
| 文件上传接口 | ❌ 缺失 | 无任何上传端点 |
| 用户头像字段 | ✅ 已有 | `AdminUser.avatar` 为 String 类型，存 URL |
| 个人中心页面 | ❌ 缺失 | Header 有"个人中心"菜单项但无页面 |
| 桶管理 | ❌ 缺失 | 无后台管理界面 |

## 二、实施计划

### Phase 1：后端基础设施

#### 1.1 依赖与配置

**pom.xml** 新增依赖：
```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>
```

**application.yml** 新增配置：
```yaml
minio:
  endpoint: ${minio.endpoint}
  access-key: ${minio.access-key}
  secret-key: ${minio.secret-key}
  bucket-name: ${minio.bucket-name:admin-uploads}
```

> 实际连接信息通过 `application-dev.yml` 的环境变量注入，不入版本控制。

#### 1.2 MinIO 配置类

**新建** `config/MinIOConfig.java`：
- 读取 yml 配置，创建 `MinioClient` Bean
- 启动时自动检查/创建默认 bucket

#### 1.3 文件上传 Service

**新建** `service/FileService.java`（接口）+ `service/impl/FileServiceImpl.java`：
- `String uploadFile(MultipartFile file, String directory)` — 上传文件到指定目录，返回访问 URL
- `String uploadAvatar(MultipartFile file)` — 上传头像（限制图片类型、大小 2MB）
- `void deleteFile(String objectName)` — 删除文件
- `List<BucketFileVO> listFiles(String prefix, int page, int size)` — 分页列出文件
- `List<String> listBuckets()` — 列出所有桶

文件命名规则：`{directory}/{yyyyMMdd}/{uuid}.{ext}`，避免冲突。

#### 1.4 文件上传 Controller

**新建** `controller/FileController.java`：

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| POST | `/api/admin/files/upload` | `uploadFile` | 通用文件上传 |
| POST | `/api/admin/files/upload/avatar` | `uploadAvatar` | 头像上传（限图片 ≤2MB） |
| DELETE | `/api/admin/files/{objectName}` | `deleteFile` | 删除文件 |
| GET | `/api/admin/files` | `listFiles` | 分页列出文件 |
| GET | `/api/admin/files/buckets` | `listBuckets` | 列出所有桶 |

#### 1.5 头像更新接口

修改 `AuthController`，新增：
- `PUT /api/admin/auth/avatar` — 上传头像并更新当前用户 avatar 字段，返回新 URL

### Phase 2：前端 — 个人中心页

**新建** `pages/Profile.tsx`：
- 用户信息展示（头像、用户名、昵称、邮箱、手机号）
- 头像上传：点击头像弹出文件选择，预览 + 上传
- 基本信息编辑：昵称、邮箱、手机号
- 修改密码区域

**���改**：
- `routes.tsx` 注册 `/profile` 路由
- `Header.tsx` "个人中心"菜单项链接到 `/profile`
- `Header.tsx` Avatar ���件显��真实头像 URL

### Phase 3：前端 — 桶存储管理页

**新建** `pages/system/StorageManagement.tsx`：
- 文件列表：表格展示文件名、大小、类型、上传时间、操作（预览/删除）
- 文件上传：拖拽上传区域
- 桶切换：下拉选择不同桶
- 图片预览：点击图片类型文件直接预览

**修改**：`routes.tsx` 注册 `/system/storage` 路由

### Phase 4：VO/DTO 设计

**文件上传响应 VO**：
```java
public class FileUploadVO {
    private String url;         // 访问地址
    private String objectName;  // 对象名（用于删除）
    private String fileName;    // 原始文件名
    private Long size;          // 文件大小
}
```

**桶文件列表 VO**：
```java
public class BucketFileVO {
    private String objectName;  // 对象路径
    private String fileName;    // 文件名
    private Long size;          // 大小
    private String contentType; // MIME 类型
    private LocalDateTime lastModified;
}
```

## 三、文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `config/MinIOConfig.java` | MinIO 客户端配置 |
| `service/FileService.java` | 文件服务接口 |
| `service/impl/FileServiceImpl.java` | 文件服务实现 |
| `controller/FileController.java` | 文件上传/管理接口 |
| `model/vo/FileUploadVO.java` | 上传响应 VO |
| `model/vo/BucketFileVO.java` | 文件列表 VO |
| `pages/Profile.tsx` | 个人中心页面 |
| `pages/system/StorageManagement.tsx` | 桶存储管理页面 |

### 修改

| 文件 | 改动 |
|------|------|
| `pom.xml` | 新增 MinIO 依赖 |
| `application.yml` | 新增 minio 配置项 |
| `application-dev.yml` | 填入实际连接信息 |
| `AuthController.java` | 新增头像上传接口 |
| `routes.tsx` | 注册 profile 和 storage 路由 |
| `Header.tsx` | 个人中心导航 + 头像 URL 展示 |

## 四、实施顺序

1. 后端：pom.xml + yml 配置 + MinIOConfig
2. 后端：FileService + FileController + VO
3. 后端：AuthController 头像接口
4. 编译验证 + 用户生成前端 API
5. 前端：Profile 个人中心页
6. 前端：StorageManagement 桶管理页

## 五、安全注意事项

- MinIO 连接信息（endpoint、access-key、secret-key）**只在 `application-dev.yml` 中配置**，该文件已在 `.gitignore` 中
- 文件上传限制：头像 ≤ 2MB、通用文件 ≤ 50MB
- 文件类型白名单：头像仅允许 jpg/jpeg/png/gif/webp
- 上传文件重命名为 UUID，防止路径穿越攻击
- 删除操作需要记录操作审计日志
