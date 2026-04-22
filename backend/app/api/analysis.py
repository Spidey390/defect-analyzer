from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io, csv
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.analysis import Analysis, AuditLog
from app.schemas.schemas import AnalysisOut
from app.services.jira_service import fetch_jira_issues, fetch_jira_projects
from app.services.git_service import analyze_git_repo
from app.services.powerbi_service import get_powerbi_token, push_rows_to_dataset, create_push_dataset
from app.core.config import settings

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _save_analysis(db, user_id, project_name, source, results, summary):
    analysis = Analysis(
        user_id=user_id,
        project_name=project_name,
        source=source,
        results=results,
        summary=summary,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    log = AuditLog(user_id=user_id, action="ANALYSIS_RUN",
                   detail=f"{source.upper()} analysis for '{project_name}' — {summary['total_modules']} modules")
    db.add(log)
    db.commit()
    return analysis


@router.post("/upload-csv", response_model=AnalysisOut)
async def analyze_csv(
    file: UploadFile = File(...),
    project_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    content = await file.read()
    try:
        from app.services.ml_service import parse_csv_to_records, run_pipeline

        records = parse_csv_to_records(content)
        results, summary = run_pipeline(records)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return _save_analysis(db, current_user.id, project_name, "csv", results, summary)


@router.get("/jira/projects")
def get_jira_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not all([current_user.jira_base_url, current_user.jira_email, current_user.jira_api_token]):
        raise HTTPException(status_code=400, detail="Jira credentials not configured. Update them in settings.")
    try:
        projects = fetch_jira_projects(
            current_user.jira_base_url,
            current_user.jira_email,
            current_user.jira_api_token,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API error: {str(e)}")
    return {"projects": projects}


@router.post("/jira/{project_key}", response_model=AnalysisOut)
def analyze_jira(
    project_key: str,
    project_name: str = "Jira Project",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not all([current_user.jira_base_url, current_user.jira_email, current_user.jira_api_token]):
        raise HTTPException(status_code=400, detail="Jira credentials not configured")
    try:
        from app.services.ml_service import run_pipeline

        records = fetch_jira_issues(
            current_user.jira_base_url,
            current_user.jira_email,
            current_user.jira_api_token,
            project_key,
        )
        results, summary = run_pipeline(records)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return _save_analysis(db, current_user.id, project_name or project_key, "jira", results, summary)


@router.post("/git", response_model=AnalysisOut)
def analyze_git(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo_url = payload.get("repo_url")
    project_name = payload.get("project_name", "Git Repository")
    
    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
        
    try:
        from app.services.ml_service import run_pipeline
        
        records = analyze_git_repo(repo_url)
        if not records:
             raise HTTPException(status_code=422, detail="No source code files found in the repository")
             
        results, summary = run_pipeline(records)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
        
    return _save_analysis(db, current_user.id, project_name, "git", results, summary)


@router.get("/history", response_model=List[AnalysisOut])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Analysis).filter(Analysis.user_id == current_user.id).order_by(Analysis.created_at.desc()).all()


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id, Analysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/{analysis_id}/download")
def download_csv(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id, Analysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["module", "risk_level", "bug_count",
                                                 "priority_score", "severity_score", "reopen_count"])
    writer.writeheader()
    for row in (analysis.results or []):
        writer.writerow({k: row.get(k, "") for k in writer.fieldnames})

    output.seek(0)
    filename = f"risk_report_{analysis.project_name}_{analysis.id}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{analysis_id}/sync-powerbi")
def sync_to_powerbi(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id, Analysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    dataset_id = settings.POWERBI_DATASET_ID
    workspace_id = settings.POWERBI_WORKSPACE_ID

    if not all([dataset_id, workspace_id]):
        raise HTTPException(status_code=400, detail="Power BI not configured in server settings")

    try:
        token = get_powerbi_token()
        if not dataset_id:
            dataset_id = create_push_dataset(workspace_id, token)
        push_rows_to_dataset(
            dataset_id=dataset_id,
            workspace_id=workspace_id,
            token=token,
            results=analysis.results,
            project_name=analysis.project_name,
            analysis_id=analysis.id,
            analysis_date=analysis.created_at.isoformat(),
        )
        analysis.powerbi_synced = True
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Power BI sync failed: {str(e)}")

    return {"message": "Synced to Power BI successfully"}
