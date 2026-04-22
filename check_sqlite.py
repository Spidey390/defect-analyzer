import sqlite3
import os

db_path = 'backend/defect_analyzer.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    # Try current directory just in case
    db_path = 'defect_analyzer.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        exit(1)

print(f"Checking database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Columns in 'users' table: {columns}")
    
    jira_cols = ['jira_base_url', 'jira_email', 'jira_api_token']
    missing = [c for c in jira_cols if c not in columns]
    if missing:
        print(f"MISSING COLUMNS: {missing}")
    else:
        print("All Jira columns are present.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
