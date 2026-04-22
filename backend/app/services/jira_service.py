import requests
import base64
from typing import List, Dict, Any, Optional


def fetch_jira_projects(base_url: str, email: str, token: str) -> List[Dict[str, Any]]:
    creds = base64.b64encode(f"{email}:{token}".encode()).decode()
    headers = {"Authorization": f"Basic {creds}", "Accept": "application/json"}
    url = f"{base_url.rstrip('/')}/rest/api/3/project"
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return [{"key": p["key"], "name": p["name"]} for p in resp.json()]


def fetch_jira_issues(
    base_url: str, email: str, token: str, project_key: str, max_results: int = 500
) -> List[Dict[str, Any]]:
    creds = base64.b64encode(f"{email}:{token}".encode()).decode()
    headers = {"Authorization": f"Basic {creds}", "Accept": "application/json"}

    all_issues = []
    start_at = 0

    while True:
        url = f"{base_url.rstrip('/')}/rest/api/3/search"
        params = {
            "jql": f"project={project_key} AND issuetype=Bug ORDER BY created DESC",
            "fields": "summary,priority,status,components,customfield_10016,created,resolutiondate",
            "maxResults": min(100, max_results - len(all_issues)),
            "startAt": start_at,
        }
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        issues = data.get("issues", [])
        if not issues:
            break
        all_issues.extend(issues)
        start_at += len(issues)
        if len(all_issues) >= max_results or start_at >= data.get("total", 0):
            break

    return _map_issues_to_records(all_issues)


def _map_issues_to_records(issues: List[Dict]) -> List[Dict[str, Any]]:
    records = []
    for issue in issues:
        fields = issue.get("fields", {})
        components = fields.get("components", [])
        module = components[0]["name"] if components else "Unassigned"
        priority_name = (fields.get("priority") or {}).get("name", "Medium")
        records.append({
            "module": module,
            "bug_count": 1,
            "priority": priority_name,
            "severity": priority_name,
            "reopen_count": 0,
            "issue_key": issue.get("key", ""),
            "summary": fields.get("summary", ""),
            "status": (fields.get("status") or {}).get("name", ""),
        })
    return records
