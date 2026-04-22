import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, inspect
from app.core.config import settings

def check_schema():
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('users')]
    print(f"Columns in 'users' table: {columns}")
    
    jira_cols = ['jira_base_url', 'jira_email', 'jira_api_token']
    missing = [c for c in jira_cols if c not in columns]
    if missing:
        print(f"MISSING COLUMNS: {missing}")
    else:
        print("All Jira columns are present.")

if __name__ == "__main__":
    check_schema()
