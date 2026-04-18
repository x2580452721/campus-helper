#!/usr/bin/env python3
"""
文档同步脚本
把 docs/ 文件夹下的文档同步到 .trae/documents/ 文件夹

使用方法:
1. 只修改 docs/ 文件夹下的文档
2. 运行此脚本同步到 .trae/documents/
3. 或者在提交前自动运行
"""

import os
import shutil

# 定义源和目标文件夹
SOURCE_DIR = "docs"
TARGET_DIR = ".trae/documents"

# 文档对应关系（源文件相对于 SOURCE_DIR 的路径 -> 目标文件名）
DOC_MAP = {
    "01-项目管理/requirements_and_bugs.md": "requirements_and_bugs.md",
    "01-项目管理/project_roadmap.md": "project_roadmap.md",
    "01-项目管理/meeting_minutes_20260414.md": "meeting_minutes_20260414.md",
    "02-产品文档/campus_helper_prd.md": "campus_helper_prd.md",
    "02-产品文档/campus_helper_srs.md": "campus_helper_srs.md",
    "03-技术文档/campus_helper_technical_architecture.md": "campus_helper_technical_architecture.md",
    "03-技术文档/DEPLOYMENT.md": "DEPLOYMENT.md",
    "04-用户文档/USER_MANUAL.md": "USER_MANUAL.md",
    "05-测试文档/test_plan.md": "test_plan.md"
}

def sync_documents():
    """同步文档"""
    print("=" * 50)
    print("📄 校园互助平台文档同步工具")
    print("=" * 50)
    
    # 检查源目录是否存在
    if not os.path.exists(SOURCE_DIR):
        print(f"❌ 源目录不存在: {SOURCE_DIR}")
        return False
    
    # 创建目标目录（如果不存在）
    os.makedirs(TARGET_DIR, exist_ok=True)
    
    # 同步文档
    success_count = 0
    for src_rel_path, dest_filename in DOC_MAP.items():
        src_path = os.path.join(SOURCE_DIR, src_rel_path)
        dest_path = os.path.join(TARGET_DIR, dest_filename)
        
        if os.path.exists(src_path):
            # 复制文件
            shutil.copy2(src_path, dest_path)
            print(f"✅ 已同步: {src_rel_path} -> {dest_filename}")
            success_count += 1
        else:
            print(f"⚠️  源文件不存在，跳过: {src_rel_path}")
    
    print("\n" + "=" * 50)
    print(f"✅ 同步完成！共同步 {success_count} 个文档")
    print("=" * 50)
    print("\n💡 提示：")
    print("  1. 请只在 docs/ 文件夹下修改文档")
    print("  2. 修改后运行此脚本同步到 .trae/documents/")
    print("  3. 然后再提交 git")
    
    return True

if __name__ == "__main__":
    sync_documents()
