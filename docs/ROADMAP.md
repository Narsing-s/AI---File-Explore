# Nova AI File Manager — Roadmap

## Milestone 0 — Repository foundation
- [x] Tauri 2 + React + TypeScript scaffold
- [x] Rust filesystem command boundary
- [x] Home directory and directory listing
- [x] Create folder
- [x] Dark and light theme
- [x] List/grid presentation
- [x] Windows/Linux CI build workflow
- [ ] Verify first successful CI builds on both operating systems

## Milestone 1 — Reliable file explorer
- [ ] Single-click selection and keyboard navigation
- [ ] Parent navigation and location picker
- [ ] Copy, cut, paste, move, and rename
- [ ] Confirmation and recovery for destructive actions
- [ ] Tabs and dual-pane mode
- [ ] File properties and safe preview
- [ ] Accessibility and localization

## Milestone 2 — Indexing and search
- [ ] SQLite schema and migrations
- [ ] Incremental background indexing
- [ ] Pause, resume, and cancel indexing
- [ ] Tantivy filename and metadata search
- [ ] Optional full-text extraction
- [ ] Duplicate detection using content hashes
- [ ] Storage usage analysis

## Milestone 3 — Local AI
- [ ] Provider interface and AI orchestrator
- [ ] Local runtime health detection
- [ ] Model selection and download consent
- [ ] Natural-language file search
- [ ] Document summarization and Q&A
- [ ] AI rename and organization proposals
- [ ] Approval-before-execution workflow

## Milestone 4 — Optional cloud AI
- [ ] Provider adapters
- [ ] Explicit per-request cloud consent
- [ ] Secure credential storage
- [ ] Data transmission preview
- [ ] Provider status and usage visibility
- [ ] No cloud fallback without consent

## Milestone 5 — Production readiness
- [ ] Large-library performance benchmarks
- [ ] Permission and symlink security tests
- [ ] Interrupted-operation recovery tests
- [ ] Windows and Linux packaging verification
- [ ] Signed release strategy
- [ ] User guide and release notes
