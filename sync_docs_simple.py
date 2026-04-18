#!/usr/bin/env python3
"""简单文档同步脚本 - 无 emoji 版本"""

import os
import shutil

# 文档对应关系
DOCS = [
    ("docs/01-项目管理/requirements_and_bugs.md", ".trae/documents/requirements_and_bugs.md"),
    ("docs/01-项目管理/project_roadmap.md", ".trae/documents/project_roadmap.md"),
    ("docs/01-项目管理/meeting_minutes_20260414.md", ".trae/documents/meeting_minutes_20260414.md"),
    ("docs/02-产品文档/campus_helper_prd.md", ".trae/documents/campus_helper_prd.md"),
    ("docs/02-产品文档/campus_helper_srs.md", ".trae/documents/campus_helper_srs.md"),
    ("docs/03-技术文档/campus_helper_technical_architecture.md", ".trae/documents/campus_helper_technical_architecture.md"),
    ("docs/03-技术文档/DEPLOYMENT.md", ".trae/documents/DEPLOYMENT.md"),
    ("docs/04-用户文档/USER_MANUAL.md", ".trae/documents/USER_MANUAL.md"),
    ("docs/05-测试文档/test_plan.md", ".trae/documents/test_plan.md"),
]

print("Syncing documents...")
count = 0

for src, dest in DOCS:
    if os.path.exists(src):
        shutil.copy2(src, dest)
        print(f"Copied: {src} -> {dest}")
        count += 1
    else:
        print(f"Not found: {src}")

print(f"\nDone! Synced {count} files.")
print("\nHint: Only edit docs in docs/ folder, then run this script!")
