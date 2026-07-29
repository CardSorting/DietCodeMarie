---
title: "Storage & Cache Management"
sidebarTitle: "Storage & Cache"
description: "Multi-tiered storage engine, shadow Git vacuuming, auto-pruning, and cache optimization for LUMI."
---

# Storage & Cache Management Infrastructure

LUMI (`cardsorting.lumi`) implements a multi-tiered storage engine to prevent disk bloat (e.g. 3GB+ extension cache accumulation) and ensure responsive developer tooling across long coding sessions.

## Storage Architecture Overview

The extension manages five dedicated storage domains within VS Code's `globalStorage` directory (`context.globalStorageUri.fsPath`) and system temp:

| Storage Domain | Path | Default Quota | Retention & Maintenance Policy |
| --- | --- | --- | --- |
| **Checkpoints** | `globalStorage/checkpoints/{cwdHash}` | Configurable (`lumi.storage.maxCheckpointMB`, default 1024MB) | Automatic shadow Git vacuuming (`git gc --prune=now`), packfile compaction, and orphan repo pruning. |
| **Tasks Data** | `globalStorage/tasks/{taskId}` | Configurable (`lumi.storage.maxTaskCount`, default 100) | Task directory creation, recursive forced deletion (`fs.rm`) on task removal, and orphan task cleanup. |
| **Cache & Temp** | `globalStorage/cache` | Configurable (`lumi.storage.maxCacheAgeDays`, default 7 days) | Stale cache file eviction, sync-queue management, and system temp directory maintenance. |
| **Puppeteer Browser** | `globalStorage/puppeteer` | 500MB target | Purges temporary browser snapshots, profile caches, and session screenshots. |
| **Substrate SQLite** | `globalStorage/*.db` / workspace DBs | Dynamic | `SQLiteMaintenanceEngine` runs WAL file checkpoint truncation (`PRAGMA wal_checkpoint(TRUNCATE)`) and freelist page vacuuming. |

---

## Key Maintenance Components

### 1. StorageManager (`src/services/storage/StorageManager.ts`)
The central singleton responsible for:
- Calculating storage breakdown (`tasksBytes`, `checkpointsBytes`, `cacheBytes`, `puppeteerBytes`, `systemTempBytes`).
- Executing `optimizeStorage(validTaskIds)` pipeline.
- Scheduling background auto-maintenance every 12 hours (unref'd timer).

### 2. Checkpoint Exclusions (`src/integrations/checkpoints/CheckpointExclusions.ts`)
To prevent large package archives and build outputs from entering shadow Git repositories, default exclusions enforce filters on:
- Packages & Binaries: `*.vsix`, `*.vsix.sig`, `*.tgz`, `*.apk`, `*.ipa`, `*.aar`, `*.dSYM`, `*.weights`, `*.safetensors`, `*.onnx`
- Build / Framework Caches: `.wxt/`, `.turbo/`, `.astro/`, `.svelte-kit/`, `.docusaurus/`, `.output/`, `.serverless/`, `.cache/`, `.vite/`, `.rspack/`, `.swc/`, `.nx/`, `.yarn/`, `.pnpm-store/`, `.vscode-test/`

### 3. Shadow Git Vacuuming (`src/integrations/checkpoints/CheckpointGitOperations.ts`)
Executes `git gc --prune=now --quiet` and `git pack-refs --all` to compact loose Git object files into packfiles and remove unreferenced commits.

---

## User Control & Configuration Settings

### VS Code Settings (`package.json`)
- `lumi.storage.maxCheckpointMB`: Max target size for shadow Git checkpoints before compaction (default `1024`).
- `lumi.storage.maxCacheAgeDays`: Max age in days for temporary cache files before deletion (default `7`).
- `lumi.storage.maxTaskCount`: Max non-favorited task count in history before auto-purging (default `100`).
- `lumi.storage.autoMaintenance`: Enable 12-hour background storage optimization (default `true`).

### Command Palette Action (`lumi.clearCache`)
Run **`LUMI: Clear Cache & Optimize Storage`** from the VS Code Command Palette to launch an interactive QuickPick:
- `⚡ Quick Storage Cleanup`: Vacuums shadow repos and purges temporary cache/temp files while preserving active tasks.
- `🧹 Full Storage Optimization`: Vacuums shadow repos, purges non-favorited tasks, clears browser caches, and truncates SQLite WAL files.
- `📊 View Storage Space Breakdown`: Displays exact MB used by Checkpoints, Tasks, Cache, Puppeteer, and System Temp.

---

## LLM Token Ingestion & Prompt Cache Optimization

Beyond disk storage, LUMI optimizes LLM prompt context and token ingestion via the **[TokenIngestionBufferEngine](file:///Users/bozoegg/Downloads/codemarie-new/src/core/api/transform/token-buffer-engine.ts)** (see [ADR-001](../architecture/adr-001-token-ingestion-buffer-engine.md)):

1. **Token 0 Prompt Cache Anchoring**: System prompt line endings and tool definitions are lexically stabilized to maximize hardware/cloud prompt cache hits (**90%+ APC hit rate**).
2. **Single-Turn Vision Eviction**: Removes historical base64 image data URLs ($T < \text{active}$), saving ~4,000 vision tokens per image per turn.
3. **10-Stage DSL Compression**: Transpiles tool outputs into inline DSL (`[tool:read_file path="..."]`), compacts diff headers (`[@diff path Lrange]`), collapses node_modules stack frames, and abbreviates JSON response keys.
4. **Ephemeral Cache Control Tagging**: Standardized injection of `{ cache_control: { type: "ephemeral" } }` onto system prompts and recent user turns.

