# CURRENT STATE & BACKLOG

## Current Phase: Phase 2 - Dynamic Port Allocation & Maintenance

### Active Action Items:
- [x] Create project tracking files (`PROJECT_MAP.md`, `WORKFLOW_GUIDELINES.md`, `PHASE_HISTORY.md`, `CURRENT_STATE.md`)
- [x] Create baseline configuration (`package.json`, `.gitignore`)
- [x] Implement Backend Core:
  - Config module & path resolver (`server/config.js`)
  - Security & path traversal middleware (`server/middleware/security.js`)
  - SQLite database service (`server/db/index.js`)
  - File management service & routes (`server/services/fileService.js`, `server/routes/files.js`)
  - Chunked file transfer service & routes (`server/services/chunkService.js`, `server/routes/upload.js`)
  - Storage discovery service & routes (`server/services/storageService.js`, `server/routes/storage.js`)
  - Dynamic TCP port auto-detector & fallback (`server/utils/portFinder.js`)
  - Express server bootstrap with auto-port allocation (`server/index.js`)
- [x] Implement Modern Dashboard Frontend:
  - Single Page HTML application (`public/index.html`)
  - Premium Glassmorphism Design System CSS (`public/css/main.css`, `public/css/components.css`)
  - Chunked upload worker & API client (`public/js/api.js`)
  - UI Components: File Grid/List, Context Menu, Storage Gauges, Drag-and-Drop Drawer, Media Preview Modals
  - Application logic (`public/js/app.js`)
- [x] Create Armbian setup & systemd installer script (`deploy-armbian.sh`)
- [x] Stop running server instances & verify port collision auto-fallback.

### Maintenance & Next Steps:
- Deploy to Armbian target hardware using `deploy-armbian.sh`.
