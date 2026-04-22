from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api import auth, analysis, admin
import app.models.user
import app.models.analysis

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Defect Risk Analyzer API",
    description="ML-powered defect risk classification with Power BI integration",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analysis.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Defect Risk Analyzer API", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
