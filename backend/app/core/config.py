from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://defect_user:yourpassword@localhost:5432/defect_db"
    SECRET_KEY: str = "change-this-in-production-must-be-32-chars-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    JIRA_BASE_URL: Optional[str] = None
    JIRA_EMAIL: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None

    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    POWERBI_WORKSPACE_ID: Optional[str] = None
    POWERBI_DATASET_ID: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
