import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from typing import List, Dict, Any, Tuple


PRIORITY_MAP = {
    "critical": 4, "highest": 4, "blocker": 4,
    "high": 3, "major": 3,
    "medium": 2, "normal": 2,
    "low": 1, "minor": 1,
    "trivial": 0, "lowest": 0
}

SEVERITY_MAP = {
    "blocker": 4, "critical": 3, "major": 2, "minor": 1, "trivial": 0
}


def normalize_dataframe(raw_data: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(raw_data)

    if "module" not in df.columns:
        raise ValueError("Data must contain a 'module' column")

    if "bug_count" not in df.columns:
        df["bug_count"] = 1

    if "priority" in df.columns:
        df["priority_score"] = df["priority"].str.lower().map(PRIORITY_MAP).fillna(1).astype(float)
    else:
        df["priority_score"] = 1.0

    if "severity" in df.columns:
        df["severity_score"] = df["severity"].str.lower().map(SEVERITY_MAP).fillna(1).astype(float)
    else:
        df["severity_score"] = 1.0

    if "reopen_count" not in df.columns:
        df["reopen_count"] = 0

    df["bug_count"] = pd.to_numeric(df["bug_count"], errors="coerce").fillna(1).astype(int)
    df["reopen_count"] = pd.to_numeric(df["reopen_count"], errors="coerce").fillna(0).astype(int)

    # Define aggregation mapping dynamically based on available columns
    agg_map = {
        "bug_count": ("bug_count", "sum"),
        "priority_score": ("priority_score", "mean"),
        "severity_score": ("severity_score", "mean"),
        "reopen_count": ("reopen_count", "sum"),
    }
    
    if "complexity_score" in df.columns:
        agg_map["complexity_score"] = ("complexity_score", "max")
    else:
        agg_map["complexity_score"] = ("bug_count", "sum") # Fallback
        
    if "issue_key" in df.columns:
        agg_map["issue_keys"] = ("issue_key", lambda x: list(x.dropna().unique()))
    else:
        df["issue_keys"] = [[] for _ in range(len(df))]
        agg_map["issue_keys"] = ("issue_keys", "first")

    agg = df.groupby("module").agg(**agg_map).reset_index()

    if "complexity_score" not in df.columns:
        agg["complexity_score"] = 0.0

    return agg


def run_pipeline(raw_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if not raw_data:
        raise ValueError("No data provided for analysis")

    df = normalize_dataframe(raw_data)

    if len(df) < 3:
        # Not enough modules for 3 clusters — assign based on bug count or complexity
        sort_col = "complexity_score" if df["complexity_score"].max() > 0 else "bug_count"
        df["cluster"] = 0
        df["risk_level"] = df[sort_col].apply(
            lambda x: "HIGH" if x >= df[sort_col].quantile(0.66)
            else ("MEDIUM" if x >= df[sort_col].quantile(0.33) else "LOW")
        )
    else:
        feature_cols = ["bug_count", "priority_score", "severity_score", "reopen_count", "complexity_score"]
        features = df[feature_cols]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(features)

        n_clusters = min(3, len(df))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df["cluster"] = kmeans.fit_predict(X_scaled)

        # Determine risk based on complexity if bug count is zero (typical for fresh Git scan)
        risk_metric = "complexity_score" if df["bug_count"].sum() == 0 else "bug_count"
        cluster_risk = df.groupby("cluster")[risk_metric].mean().sort_values(ascending=False)
        labels = ["HIGH", "MEDIUM", "LOW"][:n_clusters]
        label_map = {cluster_id: labels[i] for i, cluster_id in enumerate(cluster_risk.index)}
        df["risk_level"] = df["cluster"].map(label_map)

    results = df.to_dict("records")
    for r in results:
        for k, v in r.items():
            if isinstance(v, (np.integer,)):
                r[k] = int(v)
            elif isinstance(v, (np.floating,)):
                r[k] = round(float(v), 2)

    summary = {
        "total_modules": len(df),
        "high_count": int((df["risk_level"] == "HIGH").sum()),
        "medium_count": int((df["risk_level"] == "MEDIUM").sum()),
        "low_count": int((df["risk_level"] == "LOW").sum()),
    }

    return results, summary


def parse_csv_to_records(file_bytes: bytes) -> List[Dict[str, Any]]:
    import io
    df = pd.read_csv(io.BytesIO(file_bytes))
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df.to_dict("records")
