from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，从环境变量 / .env 文件读取"""

    # 服务器
    app_name: str = "admin-fastapi"
    app_port: int = 8000
    debug: bool = False

    # 数据库（对应 Java application-dev.yml 的 database.*）
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "scaffold_spring_dev"
    db_username: str = "postgres"
    db_password: str = ""
    db_pool_size: int = 20
    db_pool_overflow: int = 5

    # Redis（对应 redis.*）
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    redis_max_connections: int = 50

    # JWT（对应 jwt.*）
    jwt_secret: str = "dev-secret-key-do-not-use-in-production-please-change-it"
    jwt_access_expiration_ms: int = 300000       # 5 分钟
    jwt_refresh_expiration_ms: int = 604800000   # 7 天

    # CORS（对应 cors.allowed-origins）
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # MinIO（对应 minio.*）
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "admin-uploads"
    minio_secure: bool = False

    # 日志保留天数（对应 app.log.*）
    log_store_response_body: bool = False
    api_log_retention_days: int = 30
    operation_log_retention_days: int = 90
    login_log_retention_days: int = 90
    error_log_retention_days: int = 60

    # 文件（对应 app.file.*）
    recycle_bin_retention_days: int = 7

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_username}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
