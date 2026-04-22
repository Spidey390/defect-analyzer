import requests
from typing import List, Dict, Any, Optional
from app.core.config import settings


def get_powerbi_token(
    tenant_id: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> str:
    tid = tenant_id or settings.AZURE_TENANT_ID
    cid = client_id or settings.AZURE_CLIENT_ID
    csec = client_secret or settings.AZURE_CLIENT_SECRET

    if not all([tid, cid, csec]):
        raise ValueError("Azure AD credentials not configured")

    url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": cid,
        "client_secret": csec,
        "scope": "https://analysis.windows.net/powerbi/api/.default",
    }
    resp = requests.post(url, data=data, timeout=15)
    if resp.status_code != 200:
        raise Exception(f"OAuth2 Error {resp.status_code}: {resp.text}")
    return resp.json()["access_token"]


def create_push_dataset(workspace_id: str, token: str) -> str:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "name": "DefectAnalysisResults",
        "tables": [
            {
                "name": "Results",
                "columns": [
                    {"name": "Module",        "dataType": "string"},
                    {"name": "RiskLevel",     "dataType": "string"},
                    {"name": "BugCount",      "dataType": "Int64"},
                    {"name": "PriorityScore", "dataType": "Double"},
                    {"name": "SeverityScore", "dataType": "Double"},
                    {"name": "ReopenCount",   "dataType": "Int64"},
                    {"name": "ProjectName",   "dataType": "string"},
                    {"name": "AnalysisDate",  "dataType": "DateTime"},
                    {"name": "AnalysisId",    "dataType": "Int64"},
                ],
            }
        ],
    }
    url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets"
    resp = requests.post(url, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    return resp.json()["id"]


def push_rows_to_dataset(
    dataset_id: str,
    workspace_id: str,
    token: str,
    results: List[Dict[str, Any]],
    project_name: str,
    analysis_id: int,
    analysis_date: str,
) -> bool:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    rows = [
        {
            "Module": r.get("module", ""),
            "RiskLevel": r.get("risk_level", ""),
            "BugCount": int(r.get("bug_count", 0)),
            "PriorityScore": float(r.get("priority_score", 0)),
            "SeverityScore": float(r.get("severity_score", 0)),
            "ReopenCount": int(r.get("reopen_count", 0)),
            "ProjectName": project_name,
            "AnalysisDate": analysis_date,
            "AnalysisId": analysis_id,
        }
        for r in results
    ]
    url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/tables/Results/rows"
    resp = requests.post(url, headers=headers, json={"rows": rows}, timeout=15)
    resp.raise_for_status()
    return True


def get_embed_token(report_id: str, workspace_id: str, token: str) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports/{report_id}/GenerateToken"
    body = {"accessLevel": "View"}
    resp = requests.post(url, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    return resp.json()
