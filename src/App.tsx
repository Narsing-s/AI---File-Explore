import { useCallback, useEffect, useMemo, useState } from "react";
import { isBrowserFileMode, makeFolder, openHomeDirectory, parentDirectory, readDirectory, renameEntry, deleteEntry, type FileEntry } from "./platform/filesystem";
import {
  ArrowLeft, ArrowRight, ChevronRight, Command, File, FileImage,
  FileText, Folder, FolderPlus, HardDrive, Home, LayoutGrid, List, LoaderCircle,
  Moon, MoreHorizontal, RefreshCw, Search, Sparkles, Sun,
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
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);

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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const filteredEntries = useMemo(() => entries.filter((entry) =>
    entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  ), [entries, query]);

  const folders = entries.filter((entry) => entry.isDir).length;
  const files = entries.length - folders;
  const parentPath = parentDirectory(currentPath);

  const navigate = (path: string) => {
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
          <button className="nav-item active"><Home size={17} /><span>Home</span></button>
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
              <div className="search-box"><Search size={16} /><input id="global-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this folder..." /><kbd>⌘ K</kbd></div>
              <div className="view-toggle"><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} title="List view"><List size={17} /></button><button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} title="Grid view"><LayoutGrid size={17} /></button></div>
            </div>
          </div>

          <div className="path-bar">
            <button disabled={!currentPath || parentPath === currentPath} onClick={() => navigate(parentPath)} title="Go to parent"><ArrowLeft size={15} /></button>
            <button disabled={!currentPath} onClick={() => navigate(currentPath)} title="Refresh"><RefreshCw size={14} /></button>
            <span className="path-text">{currentPath || "Loading location..."}</span>
            <button disabled={!currentPath} onClick={() => navigate(currentPath)} title="Open current location"><ArrowRight size={15} /></button>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {selected && <div className="path-bar selection-actions"><strong>{selected.name}</strong><span>{selected.isDir ? "Folder" : "File"} selected</span><button onClick={copySelectedPath}>Copy path</button><button onClick={renameSelected} disabled={isBrowserFileMode() && selected.isDir} title={isBrowserFileMode() && selected.isDir ? "Folder rename is not supported by this browser" : "Rename selected item"}>Rename</button><button onClick={deleteSelected}>Delete</button><button onClick={() => setSelected(null)} title="Clear selection">Clear</button></div>}

          <div className="file-area">
            {loading ? <div className="empty-state"><LoaderCircle className="spinner" size={25} /><strong>Loading your files</strong><span>Reading this folder from your device…</span></div>
              : filteredEntries.length === 0 ? <div className="empty-state"><Folder size={30} /><strong>{query ? "No matching files" : "This folder is empty"}</strong><span>{query ? "Try another search term." : "Create a folder or browse to another location."}</span></div>
              : view === "list" ? <div className="file-table">
                <div className="table-head"><span>NAME</span><span>TYPE</span><span>SIZE</span><span>MODIFIED</span></div>
                {filteredEntries.map((entry) => <button className="file-row" key={entry.path} onDoubleClick={() => entry.isDir && navigate(entry.path)} onClick={() => setSelected(entry)}>
                  <span className="file-name-cell">{iconFor(entry)}<span>{entry.name}</span></span>
                  <span className="file-type">{entry.isDir ? "Folder" : (entry.extension?.toUpperCase() || "File")}</span>
                  <span className="file-size">{entry.isDir ? "—" : formatBytes(entry.size)}</span>
                  <span className="file-date">{formatDate(entry.modifiedAt)}</span>
                </button>)}
              </div> : <div className="file-grid">{filteredEntries.map((entry) => <button className="file-tile" key={entry.path} onClick={() => setSelected(entry)} onDoubleClick={() => entry.isDir && navigate(entry.path)}>{iconFor(entry)}<span>{entry.name}</span><small>{entry.isDir ? "Folder" : formatBytes(entry.size)}</small></button>)}</div>}
          </div>
          <footer className="statusbar"><span>{loading ? "Reading directory…" : `${filteredEntries.length} items`}</span><span><span className="status-dot" /> {isBrowserFileMode() ? "Folder access stays in this browser session" : "Files are accessed locally on this device"}</span></footer>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
