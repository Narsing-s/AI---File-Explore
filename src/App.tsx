import { useCallback, useEffect, useMemo, useState } from "react";
import { isBrowserFileMode, makeFolder, openHomeDirectory, parentDirectory, readDirectory, openFile, renameEntry, deleteEntry, copyEntry, moveEntry, type FileEntry } from "./platform/filesystem";
import {
  ArrowLeft, Copy, ChevronRight, Command, File, FileImage,
  FileText, Folder, FolderPlus, HardDrive, Home, LayoutGrid, List, LoaderCircle,
  Moon, RefreshCw, Search, Sparkles, Sun,
  Video, Music2, FileArchive, FileCode2
} from "lucide-react";

type Entry = FileEntry;

type Theme = "dark" | "light";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (seconds: number | null) => seconds
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(seconds * 1000))
  : "Unknown";

const iconFor = (entry: Entry) => {
  if (entry.isDir) return <Folder size={19} className="file-icon folder-icon" />;
  const ext = (entry.extension || "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return <FileImage size={19} className="file-icon image-icon" />;
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return <FileText size={19} className="file-icon document-icon" />;
  if (["mp4", "mkv", "mov", "avi"].includes(ext)) return <Video size={19} className="file-icon video-icon" />;
  if (["mp3", "wav", "flac", "aac"].includes(ext)) return <Music2 size={19} className="file-icon audio-icon" />;
  if (["zip", "7z", "tar", "gz", "rar"].includes(ext)) return <FileArchive size={19} className="file-icon archive-icon" />;
  if (["js", "ts", "tsx", "rs", "py", "json", "html", "css"].includes(ext)) return <FileCode2 size={19} className="file-icon code-icon" />;
  return <File size={19} className="file-icon" />;
};

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("nova-theme") as Theme) || "dark");
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "type" | "size" | "modified">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showHidden, setShowHidden] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [clipboard, setClipboard] = useState<{ entry: Entry; mode: "copy" | "cut" } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("nova-theme", theme);
  }, [theme]);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await readDirectory(path);
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      } else if ((event.ctrlKey || event.metaKey) && key === "c" && selected && !typing) {
        event.preventDefault();
        setClipboard({ entry: selected, mode: "copy" });
        setToast("Ready to copy");
      } else if ((event.ctrlKey || event.metaKey) && key === "x" && selected && !typing) {
        event.preventDefault();
        setClipboard({ entry: selected, mode: "cut" });
        setToast("Ready to move");
      } else if ((event.ctrlKey || event.metaKey) && key === "v" && clipboard && !typing) {
        event.preventDefault();
        void pasteClipboard();
      } else if (key === "f2" && selected && !typing) {
        event.preventDefault();
        void renameSelected();
      } else if (key === "delete" && selected && !typing) {
        event.preventDefault();
        void deleteSelected();
      } else if (event.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, clipboard]);

  useEffect(() => {
    if (isBrowserFileMode()) {
      setLoading(false);
      return;
    }
    openHomeDirectory()
      .then(loadDirectory)
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [loadDirectory]);

  const filteredEntries = useMemo(() => {
    const visible = entries.filter((entry) =>
      (showHidden || !entry.name.startsWith(".")) &&
      entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    );
    const direction = sortDirection === "asc" ? 1 : -1;
    return visible.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      let result = 0;
      if (sortBy === "name") result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      else if (sortBy === "type") result = (a.extension || (a.isDir ? "folder" : "")).localeCompare(b.extension || (b.isDir ? "folder" : ""));
      else if (sortBy === "size") result = a.size - b.size;
      else result = (a.modifiedAt || 0) - (b.modifiedAt || 0);
      return result * direction;
    });
  }, [entries, query, showHidden, sortBy, sortDirection]);

  const folders = entries.filter((entry) => entry.isDir).length;
  const files = entries.length - folders;
  const parentPath = parentDirectory(currentPath);

  const navigate = (path: string) => {
    setSelected(null);
    setQuery("");
    void loadDirectory(path);
  };

  const chooseFolder = async () => {
    try {
      const path = await openHomeDirectory();
      await loadDirectory(path);
    } catch (err) {
      if (String(err).toLowerCase().includes("abort")) return;
      setError(String(err));
    }
  };

  const setClipboardFromSelection = (mode: "copy" | "cut") => {
    if (!selected) return;
    setClipboard({ entry: selected, mode });
    setToast(mode === "copy" ? "Ready to copy" : "Ready to move");
    window.setTimeout(() => setToast(""), 2600);
  };

  const pasteClipboard = async () => {
    if (!clipboard || !currentPath) return;
    try {
      if (clipboard.mode === "copy") await copyEntry(clipboard.entry.path, currentPath);
      else await moveEntry(clipboard.entry.path, currentPath);
      await loadDirectory(currentPath);
      if (clipboard.mode === "cut") setClipboard(null);
      setToast(clipboard.mode === "copy" ? "Item copied" : "Item moved");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) { setError(String(err)); }
  };

  const renameSelected = async () => {
    if (!selected) return;
    const nextName = window.prompt("Rename item", selected.name);
    if (!nextName?.trim() || nextName.trim() === selected.name) return;
    try {
      await renameEntry(selected.path, nextName);
      setSelected(null);
      await loadDirectory(currentPath);
      setToast("Item renamed");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) { setError(String(err)); }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const kind = selected.isDir ? "folder and all its contents" : "file";
    if (!window.confirm(`Permanently delete this ${kind}?\n\n${selected.name}`)) return;
    try {
      await deleteEntry(selected.path);
      setSelected(null);
      await loadDirectory(currentPath);
      setToast("Item deleted");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) { setError(String(err)); }
  };

  const openSelectedFile = async (entry: Entry) => {
    if (entry.isDir) { navigate(entry.path); return; }
    try { await openFile(entry.path); }
    catch (err) { setError(String(err)); }
  };

  const copyCurrentPath = async () => {
    if (!currentPath) return;
    try {
      await navigator.clipboard.writeText(currentPath);
      setToast("Current path copied");
      window.setTimeout(() => setToast(""), 2600);
    } catch { setError("Clipboard access is unavailable in this context."); }
  };

  const copySelectedPath = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.path);
      setToast("Path copied");
      window.setTimeout(() => setToast(""), 2600);
    } catch { setError("Clipboard access is unavailable in this context."); }
  };

  const createFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;
    try {
      await makeFolder(currentPath, name);
      await loadDirectory(currentPath);
      setToast("Folder created");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) {
      setError(String(err));
    }
  };

  const locationName = currentPath.split(/[\\/]/).filter(Boolean).at(-1) || "Home";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div><div className="brand-name">nova<span>.</span></div><div className="brand-caption">AI FILE MANAGER</div></div>
        </div>

        <button className="search-shortcut" onClick={() => document.getElementById("global-search")?.focus()}>
          <Search size={16} /><span>Search files</span><kbd><Command size={10} /> K</kbd>
        </button>

        <div className="nav-section">
          <div className="section-label">WORKSPACE</div>
          <button className="nav-item active" onClick={async () => { try { const home = await openHomeDirectory(); await loadDirectory(home); } catch (err) { if (!String(err).toLowerCase().includes("abort")) setError(String(err)); } }}><Home size={17} /><span>Home</span></button>
        </div>

        <div className="sidebar-bottom">
          <div className="ai-card">
            <div className="ai-card-icon"><Sparkles size={16} /></div>
            <div className="ai-card-title">AI is on the way</div>
            <p>Local-first intelligence for your files. Your data stays on your device.</p>
            <span className="ai-status"><span /> CORE BUILD</span>
          </div>
          <div className="profile-row"><div className="profile-avatar">N</div><div className="profile-copy"><strong>Local workspace</strong><span>Private by design</span></div></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><ChevronRight size={14} /><strong>{locationName}</strong>
          </div>
          <div className="top-actions">
            <div className="privacy-pill"><span /> {isBrowserFileMode() ? "BROWSER FOLDER ACCESS" : "LOCAL STORAGE"}</div>
            <button className="icon-button" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="icon-button" title="Refresh folder" onClick={() => currentPath && loadDirectory(currentPath)}><RefreshCw size={16} /></button>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">YOUR DIGITAL SPACE</div>
              <h1>Good to see you<span>.</span></h1>
              <p className="subtitle">Everything in its place. Your files, your way.</p>
            </div>
            <div className="welcome-actions">
              {isBrowserFileMode() && <button className="secondary-button" onClick={chooseFolder}><HardDrive size={16} /> Choose folder</button>}
              <button className="secondary-button" onClick={createFolder} disabled={!currentPath}><FolderPlus size={16} /> New folder</button>
              <button className="primary-button" onClick={() => currentPath && loadDirectory(currentPath)}><RefreshCw size={16} /> Refresh</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Folder size={18} /></div><div className="stat-label">FOLDERS</div><div className="stat-value">{loading ? "—" : folders}</div><div className="stat-foot">In this location</div></div>
            <div className="stat-card"><div className="stat-icon blue"><FileText size={18} /></div><div className="stat-label">FILES</div><div className="stat-value">{loading ? "—" : files}</div><div className="stat-foot">In this location</div></div>
            <div className="stat-card"><div className="stat-icon green"><HardDrive size={18} /></div><div className="stat-label">VISIBLE ITEMS</div><div className="stat-value">{loading ? "—" : entries.length}</div><div className="stat-foot">Current folder only</div></div>
          </div>

          <div className="explorer-heading">
            <div><h2>Browse files</h2><p>{isBrowserFileMode() ? "Choose a folder on this device to browse in your browser" : "Explore folders on your device"}</p></div>
            <div className="explorer-tools">
              <select className="sort-select" aria-label="Sort files" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="name">Name</option><option value="type">Type</option><option value="size">Size</option><option value="modified">Modified</option></select>
              <button className="sort-direction" onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")} title={sortDirection === "asc" ? "Ascending order" : "Descending order"}>{sortDirection === "asc" ? "↑" : "↓"}</button>
              <label className="hidden-toggle"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /> Hidden</label>
              <div className="search-box"><Search size={16} /><input id="global-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this folder..." /><kbd>⌘ K</kbd></div>
              <div className="view-toggle"><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} title="List view"><List size={17} /></button><button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} title="Grid view"><LayoutGrid size={17} /></button></div>
            </div>
          </div>

          <div className="path-bar">
            <button disabled={!currentPath || parentPath === currentPath} onClick={() => navigate(parentPath)} title="Go to parent"><ArrowLeft size={15} /></button>
            
            <span className="path-text">{currentPath || "Loading location..."}</span>
            <button disabled={!currentPath} onClick={copyCurrentPath} title="Copy current path"><Copy size={14} /></button>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {selected && <div className="path-bar selection-actions"><strong>{selected.name}</strong><span>{selected.isDir ? "Folder" : "File"} selected</span><button onClick={copySelectedPath}>Copy path</button><button onClick={() => setClipboardFromSelection("copy")}>Copy</button><button onClick={() => setClipboardFromSelection("cut")}>Cut</button><button onClick={renameSelected} disabled={isBrowserFileMode() && selected.isDir} title={isBrowserFileMode() && selected.isDir ? "Folder rename is not supported by this browser" : "Rename selected item"}>Rename</button><button onClick={deleteSelected}>Delete</button><button onClick={() => setShowProperties((value) => !value)}>Properties</button><button onClick={() => setSelected(null)} title="Clear selection">Clear</button></div>}
          {selected && showProperties && <div className="properties-panel"><strong>Properties</strong><span><b>Name</b>{selected.name}</span><span><b>Type</b>{selected.isDir ? "Folder" : (selected.extension?.toUpperCase() || "File")}</span><span><b>Size</b>{selected.isDir ? "Not calculated" : formatBytes(selected.size)}</span><span><b>Modified</b>{formatDate(selected.modifiedAt)}</span><span><b>Location</b>{selected.path}</span></div>}

          {clipboard && <div className="clipboard-bar"><span>{clipboard.mode === "copy" ? "Copying" : "Moving"}: <strong>{clipboard.entry.name}</strong></span><button onClick={pasteClipboard} disabled={!currentPath}>Paste here</button><button onClick={() => setClipboard(null)}>Cancel</button></div>}

          <div className="file-area">
            {loading ? <div className="empty-state"><LoaderCircle className="spinner" size={25} /><strong>Loading your files</strong><span>Reading this folder from your device…</span></div>
              : filteredEntries.length === 0 ? <div className="empty-state"><Folder size={30} /><strong>{query ? "No matching files" : "This folder is empty"}</strong><span>{query ? "Try another search term." : "Create a folder or browse to another location."}</span></div>
              : view === "list" ? <div className="file-table">
                <div className="table-head"><span>NAME</span><span>TYPE</span><span>SIZE</span><span>MODIFIED</span></div>
                {filteredEntries.map((entry) => <button className={`file-row ${selected?.path === entry.path ? "selected" : ""}`} key={entry.path} onDoubleClick={() => void openSelectedFile(entry)} onClick={() => setSelected(entry)}>
                  <span className="file-name-cell">{iconFor(entry)}<span>{entry.name}</span></span>
                  <span className="file-type">{entry.isDir ? "Folder" : (entry.extension?.toUpperCase() || "File")}</span>
                  <span className="file-size">{entry.isDir ? "—" : formatBytes(entry.size)}</span>
                  <span className="file-date">{formatDate(entry.modifiedAt)}</span>
                </button>)}
              </div> : <div className="file-grid">{filteredEntries.map((entry) => <button className={`file-tile ${selected?.path === entry.path ? "selected" : ""}`} key={entry.path} onClick={() => setSelected(entry)} onDoubleClick={() => void openSelectedFile(entry)}>{iconFor(entry)}<span>{entry.name}</span><small>{entry.isDir ? "Folder" : formatBytes(entry.size)}</small></button>)}</div>}
          </div>
          <footer className="statusbar"><span>{loading ? "Reading directory…" : `${filteredEntries.length} items`}</span><span><span className="status-dot" /> {isBrowserFileMode() ? "Folder access stays in this browser session" : "Files are accessed locally on this device"}</span></footer>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
