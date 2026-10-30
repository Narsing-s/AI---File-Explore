# Nova AI File Manager — Architecture

## Principles

1. Local-first: filesystem operations and metadata stay on the user's device.
2. Least privilege: expose narrow, validated platform operations rather than a general-purpose shell.
3. Explicit consent: cloud AI and destructive actions require clear user approval.
4. Modular AI: providers are adapters behind a provider-independent orchestrator.
5. Responsive UI: scanning, indexing, hashing and inference run outside the UI thread.
6. Recoverability: bulk mutations require previews, logs and undo where possible.
7. Platform parity: share product workflows, not assumptions about filesystem permissions.

## Runtime layers

- **React + TypeScript:** shared presentation, navigation, selection and view state.
- **Filesystem adapter (src/platform/filesystem.ts):** selects the correct filesystem implementation at runtime.
- **Browser adapter:** uses the File System Access API after a user gesture and explicit folder selection. Access is limited to granted directory handles; handles are currently in-memory only.
- **Tauri 2:** native desktop/mobile window and IPC boundary.
- **Rust core:** desktop filesystem access, validation, job coordination and platform integration.
- **Future database/indexer:** SQLite metadata cache and Tantivy local search.
- **AI orchestrator:** structured intent and tool planning; it has no direct filesystem authority.
- **Provider adapters:** local inference first; optional cloud providers only after explicit setup.

## Platform constraints

### Web
Browsers do not expose arbitrary filesystem paths. The user must select a folder, and the browser grants access to that directory. The current browser adapter supports listing, metadata, in-folder filtering and folder creation in supported Chromium browsers. Permission handles are not yet persisted across reloads. Unsupported browsers should receive a clear explanation rather than a fake file listing.

### Windows and Linux
Tauri invokes narrow Rust commands for native filesystem operations. The current implementation supports home-directory discovery, listing and folder creation. Further operations must validate paths and handle symlinks, permissions, collisions and partial failures.

### Android
A desktop-style absolute-path filesystem model is not appropriate for modern Android. The implementation must use Android's Storage Access Framework and content URIs for user-selected files/folders. Avoid broad storage permissions unless a clearly justified feature requires them. Android is not considered supported until this integration and APK/AAB device tests exist.

## Security boundary

The frontend may request only registered Tauri commands or browser-granted directory operations. Rust validates every path and operation. Do not add shell execution as a shortcut for file management. Never follow symbolic links implicitly during recursive scans. Treat file contents as untrusted input.

Cloud AI adapters must be disabled by default. Before transmitting content, show the provider, data scope and reason, and obtain explicit confirmation. API credentials belong in the operating-system credential store, not source code or SQLite plaintext.

## Current implementation

- Tauri desktop shell and Rust filesystem commands.
- Browser directory picker adapter for supported browsers.
- Directory listing and metadata.
- Folder creation.
- In-folder search, list/grid views and dark/light theme.
- Windows/Linux build workflow and web deployment workflow.

Copy/move/rename/delete, tabs, indexing, full-text search, previews, Android SAF and AI remain planned work. The UI must not present these as implemented.
