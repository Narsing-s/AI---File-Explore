# Nova AI File Manager

A local-first file manager built with React, TypeScript, Tauri 2 and Rust, with a shared interface across browser and native desktop targets.

## Platform status

| Platform | Current capability | Status |
|---|---|---|
| Web (Chrome/Edge) | User-selected folder browsing, metadata, in-folder search, list/grid views, create folder, open file, file rename, copy, move, permanent delete | Core browser foundation |
| Windows | Native home-directory browsing, folder creation, open with default app, rename, copy, move, permanent delete | Desktop foundation |
| Linux | Native home-directory browsing, folder creation, open with default app, rename, copy, move, permanent delete | Desktop foundation |
| Android | Tauri mobile entry point exists; Storage Access Framework and Android packaging are not yet implemented | Planned |

**Web privacy:** the browser asks the user to select a folder. Nova reads and creates folders only within the granted browser directory handle. Browser folder handles are held in memory for the current session; users may need to select the folder again after reloading. Browser file access requires a supported secure context and a Chromium-based browser such as current Chrome or Edge.

## Product direction

- Local-first filesystem operations and privacy-preserving defaults.
- One shared React interface with platform-specific filesystem adapters.
- Optional local AI runtime; cloud AI only after explicit opt-in.
- Fast background indexing, full-text search and duplicate detection.
- No mandatory account, API key, subscription or hosted backend.

## Current capabilities

- Home-directory discovery in native desktop builds.
- User-selected folder browsing in supported browsers.
- Directory listing and file metadata.
- Folder creation.
- Open files with the system default application (desktop) or a browser tab (web).
- Rename files and folders on desktop; rename files in supported browsers.
- Copy and move files/folders, including recursive folder copy and collision checks.
- Permanent delete with explicit confirmation.
- Keyboard shortcuts: Ctrl/Cmd+K search, Ctrl/Cmd+A select visible items, Ctrl/Cmd+C copy, Ctrl/Cmd+X cut, Ctrl/Cmd+V paste, F2 rename a single item and Delete remove selected items.
- Multi-select files and folders with Ctrl/Cmd-click in list or grid view; batch copy, cut/move, paste and permanent delete. Failed batch items remain available for retry.
- Search within the currently displayed directory.
- Sort by name, type, size or modified date; toggle ascending/descending order.
- Show or hide dot-prefixed hidden files.
- Inspect file/folder properties including type, size, modified time and path.
- Dark/light themes and list/grid views.
- Windows and Linux Tauri build workflow.
- GitHub Pages web build/deployment workflow.

Global indexing, recoverable trash, undo, advanced previews, tabs and Android Storage Access Framework integration are not yet implemented. Browser folder rename is not supported by the browser File System Access API. Browser file operations require a supported secure context and a Chromium-based browser such as current Chrome or Edge.

## Requirements

- Node.js 20.19+ or 22.12+
- Rust stable toolchain for desktop builds
- Tauri 2 platform prerequisites for native builds

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Development

```bash
npm install
npm run dev
```

For native desktop development:

```bash
npm run tauri:dev
```

## Production builds

```bash
npm run build
npm run tauri:build
```

GitHub Actions builds Windows/Linux desktop bundles and deploys the web build to GitHub Pages after the workflow is merged to main. Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository if Pages deployment is not already enabled.

## Architecture

- src/: shared React UI and browser/native filesystem adapter.
- src-tauri/src/: Rust desktop commands and filesystem access.
- docs/: architecture, security and roadmap.

## Privacy and safety

Filesystem access remains local. Browser access is scoped to the folder the user selects. Cloud AI, when introduced, must be explicitly configured and opt-in. Permanent deletion (including batch deletion) currently requires confirmation but is not recoverable; a trash/recovery workflow and operation journal are still required before production use. AI-generated actions must never execute without validation and user approval.

## Status

Early development. The browser folder-access foundation and Windows/Linux desktop foundation are available; this is not yet a feature-complete replacement for the operating system's file manager.
