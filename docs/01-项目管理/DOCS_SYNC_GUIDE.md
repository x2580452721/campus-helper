# 文档同步指南

## 背景

为了避免同时维护两份相同文档，我们使用以下方案：

- **主文档目录：** `docs/` （按文件夹分类）
- **Trae IDE 文档目录：** `.trae/documents/` （通过同步脚本从 docs/ 复制）

## 工作流程

### 修改文档时

1. **只修改** `docs/` 文件夹下的文档
2. 修改完成后，运行同步脚本
3. 然后提交 git

### 同步脚本使用

#### Windows 用户（推荐）

```bash
python sync_docs_simple.py
```

或者手动复制：
- docs/01-项目管理/ -> .trae/documents/
- docs/02-产品文档/ -> .trae/documents/
- docs/03-技术文档/ -> .trae/documents/
- docs/04-用户文档/ -> .trae/documents/
- docs/05-测试文档/ -> .trae/documents/

## 文档对应关系

| docs/ 下的文件 | .trae/documents/ 下的文件 |
|---|---|
| docs/01-项目管理/requirements_and_bugs.md | requirements_and_bugs.md |
| docs/01-项目管理/project_roadmap.md | project_roadmap.md |
| docs/01-项目管理/meeting_minutes_20260414.md | meeting_minutes_20260414.md |
| docs/02-产品文档/campus_helper_prd.md | campus_helper_prd.md |
| docs/02-产品文档/campus_helper_srs.md | campus_helper_srs.md |
| docs/03-技术文档/campus_helper_technical_architecture.md | campus_helper_technical_architecture.md |
| docs/03-技术文档/DEPLOYMENT.md | DEPLOYMENT.md |
| docs/04-用户文档/USER_MANUAL.md | USER_MANUAL.md |
| docs/05-测试文档/test_plan.md | test_plan.md |
| docs/01-项目管理/DOCS_SYNC_GUIDE.md | DOCS_SYNC_GUIDE.md |
| docs/03-技术文档/APP_LOCATION_GUIDE.md | APP_LOCATION_GUIDE.md |

## 重要说明

⚠️ **请不要直接修改 .trae/documents/ 下的文件！
- 你的修改可能会在下一次同步时被覆盖
- 请只修改 docs/ 下的文档，然后运行同步脚本

✅ **正确的工作流程：**
1. 打开 docs/ 文件夹，找到你要修改的文档
2. 修改文档
3. 运行 `python sync_docs_simple.py` 同步到 .trae/documents/
4. 提交 git
