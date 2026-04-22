import sys
import os
from sqlalchemy import create_engine, text

# Add backend to path to import settings
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from app.core.config import settings
except ImportError:
    print("Could not import settings. Make sure you are in the project root.")
    exit(1)

def migrate():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    
    columns_to_add = [
        ("jira_base_url", "VARCHAR"),
        ("jira_email", "VARCHAR"),
        ("jira_api_token", "VARCHAR")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            try:
                print(f"Adding column {col_name}...")
                # SQLite and Postgres have slightly different syntax for adding columns
                # but 'ALTER TABLE users ADD COLUMN name TYPE' is generally compatible
                if settings.DATABASE_URL.startswith("sqlite"):
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                else:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"Successfully added {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                    print(f"Column {col_name} already exists, skipping.")
                else:
                    print(f"Error adding {col_name}: {e}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
