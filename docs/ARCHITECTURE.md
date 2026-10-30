# Nova AI File Manager — Architecture

## Principles

1. Local-first: filesystem operations and metadata stay on the user's device.
2. Least privilege: expose narrow Rust commands rather than a general-purpose shell.
3. Explicit consent: cloud AI and destructive actions require clear user approval.
4. Modular AI: providers are adapters behind a provider-independent orchestrator.
5. Responsive UI: scanning, indexing, hashing, and inference run outside the UI thread.
6. Recoverability: future bulk mutations must support previews, logs, and undo where possible.

## Runtime layers

- **React + TypeScript:** presentation, navigation, view state, accessibility.
- **Tauri 2:** desktop window and IPC boundary.
- **Rust core:** filesystem access, validation, job coordination, platform integration.
- **SQLite:** durable settings, indexed metadata, operation journal.
- **Tantivy:** local full-text and metadata search.
- **AI orchestrator:** structured intent and tool planning; no direct filesystem authority.
- **Provider adapters:** local inference first; optional cloud providers only after explicit setup.

## Current implementation

The first scaffold includes:
- Tauri desktop shell.
- Native home-directory lookup.
- Directory listing with metadata.
- Folder creation with basic name validation.
- React file list/grid view and in-folder filtering.
- Dark/light theme preference.
- Cross-platform build workflow.

The UI must not imply that staged features are already implemented. Recent files, favorites, AI, and advanced settings remain roadmap items.

## Security boundary

The frontend may request only registered Tauri commands. Rust validates every path and operation. Do not add shell execution as a shortcut for file management. Never trust AI-generated paths or actions without validation. Avoid following symbolic links implicitly during recursive scans. Treat file contents as untrusted input.

Cloud AI adapters must be disabled by default. Before transmitting content, show the provider, data scope, and reason, and obtain explicit confirmation. API credentials belong in the operating-system credential store, not source code or SQLite plaintext.

## Planned modules

- filesystem: browsing, metadata, safe mutations.
- indexing: incremental traversal, cancellation, pause/resume.
- search: filename, metadata, and full-text query.
- database: schema migrations and metadata cache.
- ai: orchestration, structured tool schema, local/cloud adapters.
- operations: job queue, progress, audit log, undo.
- previews: safe, bounded document and media previews.
