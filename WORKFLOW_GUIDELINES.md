# WORKFLOW GUIDELINES & ARCHITECTURAL STANDARDS

## 1. Coding & Annotation Standard
All JavaScript, CSS, HTML, and Shell files created or updated in this repository MUST contain the standard metadata header block at line 1:

```javascript
/**
 * @file [File Path / Name]
 * @description [Brief description of file purpose and responsibility]
 * @module [Module Name]
 * @dependencies [Key dependencies used]
 * @author Agent Architecture Directive
 */
```

For HTML files:
```html
<!--
  @file [File Path / Name]
  @description [Brief description of file purpose and responsibility]
  @module [Module Name]
  @dependencies [Key dependencies used]
  @author Agent Architecture Directive
-->
```

For Shell scripts:
```bash
# @file [File Path / Name]
# @description [Brief description of file purpose and responsibility]
# @module [Module Name]
# @dependencies [Key dependencies used]
# @author Agent Architecture Directive
```

---

## 2. Security Protocols (Mandatory Defense-in-Depth)

1. **Path Traversal & Escalation Prevention:**
   - ALL incoming user file paths (`req.query.path`, `req.body.path`, etc.) MUST be resolved against the designated root storage directory using `path.resolve` and verified with `.startsWith(rootStoragePath)`.
   - Any attempt to reference outside roots (e.g. `../`, null bytes `%00`, symbolic links pointing outside allowed mounts) MUST be blocked immediately with HTTP 403 Forbidden.

2. **Command & Shell Injection Defense:**
   - Never use `child_process.exec()` with concatenated user input strings.
   - Use `child_process.execFile()` or `child_process.spawn()` with sanitized argument arrays when running system utilities like `df` or `du`.

3. **Arbitrary File Execution Prevention:**
   - Uploaded files are stored in specified storage folders without execution privileges (`chmod 644`).
   - Direct execution of binary files from user storage paths is forbidden.

4. **CSRF & Rate-Limiting Protection:**
   - Implement rate limiting middleware for chunk upload endpoints to prevent disk exhaustion attacks.
   - Set strict HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 3. Chunked File Transfer Protocol

1. **Initialization (`/api/upload/init`):**
   - Client sends file metadata (name, totalSize, chunkSize, targetPath).
   - Server validates path, checks available disk space, registers upload session in SQLite database, creates temporary chunk directory `.chunks/{sessionId}/`.

2. **Chunk Transmission (`/api/upload/chunk`):**
   - Client sends chunk data as `multipart/form-data` or raw binary payload with session ID and index `i`.
   - Server writes `chunk_{i}` file, updates session record, returns missing indices.

3. **Resumption:**
   - If transfer is interrupted, client calls `/api/upload/status?sessionId=xyz` to fetch existing chunk indices on server and resumes from the first missing chunk.

4. **Assembly (`/api/upload/complete`):**
   - Server verifies all chunks `0..N-1` are present.
   - Merges chunks sequentially into target file path using NodeJS stream pipeline.
   - Deletes temporary chunk folder `.chunks/{sessionId}/` and session record from SQLite.

---

## 4. UI/UX & Design System Principles
- **Color Palette:** Deep obsidian slate `#0f172a`, modern glass panels `#1e293b99`, indigo glowing accents `#6366f1`, soft text cyan `#e2e8f0`.
- **Interactivity:** Fluid CSS transitions (`150ms cubic-bezier(0.4, 0, 0.2, 1)`), custom right-click context menu, full keyboard navigation (Escape to close modals, Delete key to delete files, Enter to view/open).
- **Responsive Media Viewer:** Automatic format detection (MP4/WebM/MKV video player, MP3/WAV audio player, Code viewer with line numbers, Image zoom viewer, PDF iframe viewer).
