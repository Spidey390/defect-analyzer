import os
import shutil
import tempfile
from git import Repo
from radon.complexity import cc_visit
from typing import List, Dict, Any

def analyze_git_repo(repo_url: str) -> List[Dict[str, Any]]:
    """
    Clones a git repository to a temporary directory and analyzes 
    the cyclomatic complexity of all Python files.
    """
    temp_dir = tempfile.mkdtemp()
    records = []
    
    try:
        print(f"Cloning {repo_url} to {temp_dir}...")
        Repo.clone_from(repo_url, temp_dir, depth=1)
        
        for root, _, files in os.walk(temp_dir):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, temp_dir)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            code = f.read()
                            
                        # Visit the AST and get complexity blocks
                        blocks = cc_visit(code)
                        
                        if not blocks:
                            continue
                            
                        # Calculate average complexity for the file
                        total_complexity = sum(b.complexity for b in blocks)
                        avg_complexity = total_complexity / len(blocks)
                        max_complexity = max(b.complexity for b in blocks)
                        
                        records.append({
                            "module": rel_path,
                            "bug_count": 0,  # No bug data from Git yet
                            "priority": "Medium",
                            "severity": "Medium",
                            "reopen_count": 0,
                            "complexity_score": round(avg_complexity, 2),
                            "max_complexity": max_complexity
                        })
                    except Exception as e:
                        print(f"Error analyzing {rel_path}: {e}")
                        
    finally:
        # Cleanup: remove temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)
        
    return records
