import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Command, File, FileImage,
  FileText, Folder, FolderPlus, HardDrive, Home, LayoutGrid, List, LoaderCircle,
  Moon, MoreHorizontal, RefreshCw, Search, Settings2, Sparkles, Sun, Upload,
  Video, Music2, FileArchive, FileCode2, Clock3
} from "lucide-react";

type Entry = {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt: number | null;
  extension: string | null;
};

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("nova-theme", theme);
  }, [theme]);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Entry[]>("list_directory", { path });
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    invoke<string>("home_directory")
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
  const parentPath = currentPath.replace(/[\\/]+$/, "").replace(/[\\/][^\\/]*$/, "") || currentPath;

  const navigate = (path: string) => {
    setQuery("");
    void loadDirectory(path);
  };

  const createFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;
    try {
      await invoke("create_folder", { parent: currentPath, name });
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
          <button className="nav-item" onClick={() => currentPath && navigate(currentPath)}><Folder size={17} /><span>All files</span></button>
          <button className="nav-item" onClick={() => setToast("Recent files will be added in the next milestone")}><Clock3 size={17} /><span>Recent</span><span className="nav-soon">Soon</span></button>
        </div>

        <div className="nav-section">
          <div className="section-label">QUICK ACCESS</div>
          <button className="nav-item" onClick={() => currentPath && navigate(currentPath)}><Folder size={17} /><span>Current folder</span></button>
          <button className="nav-item" onClick={() => setToast("Favorites are coming in a later milestone")}><Sparkles size={17} /><span>Favorites</span><span className="nav-soon">Soon</span></button>
        </div>

        <div className="sidebar-bottom">
          <div className="ai-card">
            <div className="ai-card-icon"><Sparkles size={16} /></div>
            <div className="ai-card-title">AI is on the way</div>
            <p>Local-first intelligence for your files. Your data stays on your device.</p>
            <span className="ai-status"><span /> CORE BUILD</span>
          </div>
          <button className="nav-item settings-item" onClick={() => setToast("Settings panel is planned for the next milestone")}><Settings2 size={17} /><span>Settings</span></button>
          <div className="profile-row"><div className="profile-avatar">N</div><div className="profile-copy"><strong>Local workspace</strong><span>Private by design</span></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><ChevronRight size={14} /><strong>{locationName}</strong>
          </div>
          <div className="top-actions">
            <div className="privacy-pill"><span /> LOCAL STORAGE</div>
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
              <button className="secondary-button" onClick={createFolder}><FolderPlus size={16} /> New folder</button>
              <button className="primary-button" onClick={() => currentPath && loadDirectory(currentPath)}><RefreshCw size={16} /> Refresh</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Folder size={18} /></div><div className="stat-label">FOLDERS</div><div className="stat-value">{loading ? "—" : folders}</div><div className="stat-foot">In this location</div></div>
            <div className="stat-card"><div className="stat-icon blue"><FileText size={18} /></div><div className="stat-label">FILES</div><div className="stat-value">{loading ? "—" : files}</div><div className="stat-foot">In this location</div></div>
            <div className="stat-card"><div className="stat-icon green"><HardDrive size={18} /></div><div className="stat-label">VISIBLE ITEMS</div><div className="stat-value">{loading ? "—" : entries.length}</div><div className="stat-foot">Current folder only</div></div>
          </div>

          <div className="explorer-heading">
            <div><h2>Browse files</h2><p>Explore folders on your device</p></div>
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
          <div className="file-area">
            {loading ? <div className="empty-state"><LoaderCircle className="spinner" size={25} /><strong>Loading your files</strong><span>Reading this folder from your device…</span></div>
              : filteredEntries.length === 0 ? <div className="empty-state"><Folder size={30} /><strong>{query ? "No matching files" : "This folder is empty"}</strong><span>{query ? "Try another search term." : "Create a folder or browse to another location."}</span></div>
              : view === "list" ? <div className="file-table">
                <div className="table-head"><span>NAME</span><span>TYPE</span><span>SIZE</span><span>MODIFIED</span></div>
                {filteredEntries.map((entry) => <button className="file-row" key={entry.path} onDoubleClick={() => entry.isDir && navigate(entry.path)} onClick={() => entry.isDir && setToast(`Folder selected: ${entry.name}`)}>
                  <span className="file-name-cell">{iconFor(entry)}<span>{entry.name}</span></span>
                  <span className="file-type">{entry.isDir ? "Folder" : (entry.extension?.toUpperCase() || "File")}</span>
                  <span className="file-size">{entry.isDir ? "—" : formatBytes(entry.size)}</span>
                  <span className="file-date">{formatDate(entry.modifiedAt)}</span>
                </button>)}
              </div> : <div className="file-grid">{filteredEntries.map((entry) => <button className="file-tile" key={entry.path} onDoubleClick={() => entry.isDir && navigate(entry.path)}>{iconFor(entry)}<span>{entry.name}</span><small>{entry.isDir ? "Folder" : formatBytes(entry.size)}</small></button>)}</div>}
          </div>
          <footer className="statusbar"><span>{loading ? "Reading directory…" : `${filteredEntries.length} items`}</span><span><span className="status-dot" /> Files are accessed locally on this device</span></footer>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
