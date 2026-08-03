# PROJECT MAP - CloudNest Personal Cloud Storage

## 1. Directory Structure & File Map
```
cloudnest/
├── deploy-armbian.sh            # One-click native Armbian deployment & systemd installer
├── package.json                 # Node.js dependencies & execution scripts
├── PROJECT_MAP.md               # Folder tree, component index, API endpoint map, database schema
├── WORKFLOW_GUIDELINES.md       # Coding standards, security rules, module interaction protocols
├── PHASE_HISTORY.md             # Historic log of completed implementation phases
├── CURRENT_STATE.md             # Immediate task backlog, current phase status
├── mock_storage/                # Mock environment root for Windows OS development
│   ├── media/
│   │   └── usb_drive_1/        # Mock USB storage mount
│   └── mnt/
│       └── ext_storage/         # Mock HDD storage mount
├── server/                      # Node.js Express Backend
│   ├── index.js                 # Express server bootstrap & middleware pipeline with dynamic port resolution
│   ├── config.js                # System configuration & path resolvers
│   ├── db/
│   │   └── index.js             # SQLite database connection, schema migration & helpers
│   ├── middleware/
│   │   └── security.js          # Security middleware (Path sanitization, Rate limiter, CSRF token validation)
│   ├── routes/
│   │   ├── files.js             # File management API (list, delete, move, copy, rename, properties)
│   │   ├── upload.js            # Chunked upload API (init, chunk upload, assembly, status, resume)
│   │   └── storage.js           # Storage mounts discovery & disk usage monitoring API
│   ├── services/
│   │   ├── fileService.js       # File system operations & security checks
│   │   ├── chunkService.js      # Chunk buffer management, merging & cleanup
│   │   └── storageService.js    # Linux `/media` & `/mnt` dynamic mount scanning & fallback
│   └── utils/
│       └── portFinder.js        # Dynamic TCP port auto-detector with conflict fallback

└── public/                      # Modern Vanilla JS Frontend Application
    ├── index.html               # Single Page Application HTML shell
    ├── css/
    │   ├── main.css             # Design tokens, global resets, dark mode glassmorphism layout
    │   └── components.css       # File manager grid, list view, context menu, modals, drawers
    └── js/
        ├── api.js               # API service & chunked upload worker with resume capability
        ├── app.js               # Core UI orchestrator, state management & keyboard shortcuts
        └── components/
            ├── contextMenu.js   # Dynamic right-click context menu handler
            ├── fileGrid.js      # High-density file manager grid & list renderer
            ├── previewModal.js  # Universal media viewer (Video, Audio, Image, Code, PDF)
            ├── storageSidebar.js# Storage drive usage & navigation sidebar
            └── uploadManager.js # Drag-and-drop zone & batch upload queue drawer
```

---

## 2. API Endpoint Architecture

| Method | Endpoint | Description | Security Guards |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/storage/drives` | Discover mounted storage devices & disk space | Path Sanitization |
| **GET** | `/api/files/list` | List directory contents with metadata | Path Traversal Guard |
| **POST** | `/api/files/mkdir` | Create new directory | Path Traversal Guard |
| **DELETE**| `/api/files/delete` | Delete file or directory | Strict Path Validation |
| **POST** | `/api/files/rename` | Rename file or directory | Strict Path Validation |
| **POST** | `/api/files/move` | Move file or directory | Target Path Validation |
| **POST** | `/api/files/copy` | Copy file or directory | Target Path Validation |
| **GET** | `/api/files/download` | Stream/download file or directory zip | Path Guard, Stream Headers |
| **GET** | `/api/files/preview` | Stream file for browser preview / player | Range Support, Path Guard |
| **POST** | `/api/files/share` | Generate public share link | Token Generator |
| **GET** | `/api/files/share/:token`| Access public shared file | Token Verification |
| **POST** | `/api/upload/init` | Initialize chunked upload session | Rate Limit, Size Validation |
| **POST** | `/api/upload/chunk` | Upload file chunk (index N) | Session Check, Checksum |
| **POST** | `/api/upload/complete` | Merge chunks into target file | Assembly & Integrity Check |
| **GET** | `/api/upload/status` | Query uploaded chunks for resume capability | Session Check |

---

## 3. Database Schema (SQLite `cloudnest.db`)

```sql
CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    target_path TEXT NOT NULL,
    total_size INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_links (
    token TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    is_directory BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
);
```
