from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "AegisOSINT"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./aegis.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "*"
    ]
    
    # Scanning limits
    MAX_CONCURRENT_REQUESTS: int = 20
    DEFAULT_TIMEOUT_SECONDS: float = 12.0
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

