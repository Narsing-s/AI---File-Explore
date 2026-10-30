# Nova AI File Manager — Roadmap

## Milestone 0 — Repository foundation
- [x] Tauri 2 + React + TypeScript scaffold
- [x] Rust filesystem command boundary
- [x] Native home directory and directory listing
- [x] Create folder
- [x] Dark/light theme and list/grid views
- [x] Windows/Linux CI build workflow
- [x] Browser filesystem adapter using user-granted directory handles
- [x] Web build and GitHub Pages deployment workflow

## Milestone 1 — Reliable cross-platform explorer
- [ ] Single-click selection, keyboard navigation and accessible focus states
- [ ] Location picker and pinned/favorite locations
- [ ] Copy, cut, paste, move and rename with collision handling
- [ ] Delete to trash where supported; confirmation and recovery elsewhere
- [ ] Tabs and dual-pane mode
- [ ] File properties and safe previews
- [ ] Browser permission recovery and persistent handle support where supported
- [ ] Responsive Android navigation and touch interactions
- [ ] Localization and accessibility audit

## Milestone 2 — Android support
- [ ] Initialize and validate Tauri Android project
- [ ] Android Storage Access Framework integration (user-selected documents/tree)
- [ ] Scoped-storage-safe operations; no broad storage permission by default
- [ ] Android back navigation, share/open-with and content URI handling
- [ ] Build and test APK/AAB on Android CI
- [ ] Physical-device tests across supported Android versions

## Milestone 3 — Indexing and search
- [ ] SQLite schema and migrations
- [ ] Incremental background indexing with pause/resume/cancel
- [ ] Tantivy filename and metadata search
- [ ] Optional bounded full-text extraction
- [ ] Duplicate detection using content hashes
- [ ] Storage usage analysis and large-file discovery

## Milestone 4 — Local AI
- [ ] Provider interface and AI orchestrator
- [ ] Local runtime health detection and model management
- [ ] Natural-language file search with source/result explanations
- [ ] Document summarization and Q&A
- [ ] AI rename and organization proposals
- [ ] Preview, validate and approve every proposed operation
- [ ] Resource-aware model selection for desktop and mobile

## Milestone 5 — Optional cloud AI
- [ ] Provider adapters
- [ ] Explicit per-request cloud consent
- [ ] Secure credential storage
- [ ] Data transmission preview
- [ ] Provider status and usage visibility
- [ ] No cloud fallback without consent

## Milestone 6 — Production readiness
- [ ] Unit, integration and end-to-end tests
- [ ] Large-library performance benchmarks
- [ ] Permission, symlink and path traversal security tests
- [ ] Interrupted-operation recovery tests
- [ ] Windows, Linux, web and Android release verification
- [ ] Signed desktop and Android release strategy
- [ ] User guide, privacy documentation and release notes
