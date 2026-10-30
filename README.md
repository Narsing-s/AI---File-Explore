# Nova AI File Manager

A local-first, 64-bit desktop file manager for Windows and Linux, built with Tauri 2, Rust, React and TypeScript.

## Product direction

- Native filesystem browsing with a responsive desktop interface.
- Dark and light themes.
- Local-first architecture and privacy-preserving defaults.
- Optional local AI runtime and opt-in cloud AI providers.
- Fast background indexing and full-text search in later milestones.
- No mandatory account, API key, subscription, or hosted backend.

## Current milestone: Nova Core foundation

This initial scaffold provides:
- Home-directory discovery.
- Native directory listing and navigation.
- Folder creation.
- File/folder metadata display.
- Search within the currently displayed directory.
- Dark/light theme switching.
- Windows and Linux Tauri build configuration.

AI, indexing, duplicate detection, previews, archive support, and destructive file operations are intentionally staged for later milestones rather than represented by non-functional controls.

## Requirements

- Node.js 20.19+ or 22.12+
- Rust stable toolchain
- Tauri 2 platform prerequisites

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Development

```bash
npm install
npm run tauri:dev
```

## Production build

```bash
npm run build
npm run tauri:build
```

Linux packages depend on the target distribution and installed Tauri system libraries. Windows builds should be produced on a Windows runner; Linux packages on Linux runners.

## Architecture

- `src/`: React UI.
- `src-tauri/src/`: Rust desktop commands and filesystem access.
- `docs/`: architecture, security, and roadmap.

## Privacy and safety

The application operates on local files. It does not upload file contents to a cloud service. Cloud AI integration, when introduced, must be explicitly configured and opt-in. Destructive operations must include confirmation and appropriate recovery behavior.

## Status

Early development scaffold. Not yet a feature-complete replacement for the operating system's file manager.
