from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# Auth
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    jira_base_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None

    class Config:
        from_attributes = True

# Jira config
class JiraConfig(BaseModel):
    jira_base_url: str
    jira_email: str
    jira_api_token: str

# Analysis
class ModuleResult(BaseModel):
    module: str
    bug_count: int
    priority_score: float
    severity_score: float
    reopen_count: int
    risk_level: str
    cluster: int

class AnalysisSummary(BaseModel):
    total_modules: int
    high_count: int
    medium_count: int
    low_count: int

class AnalysisOut(BaseModel):
    id: int
    project_name: str
    source: str
    status: str
    results: Optional[List[Dict[str, Any]]] = None
    summary: Optional[Dict[str, Any]] = None
    powerbi_synced: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Power BI
class PowerBISetup(BaseModel):
    azure_tenant_id: str
    azure_client_id: str
    azure_client_secret: str
    powerbi_workspace_id: str

# Admin
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    detail: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
