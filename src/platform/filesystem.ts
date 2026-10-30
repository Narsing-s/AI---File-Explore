import { invoke } from "@tauri-apps/api/core";

export type FileEntry = {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt: number | null;
  extension: string | null;
};

type BrowserFileHandle = {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: File | Blob): Promise<void>; close(): Promise<void> }>;
};

type BrowserDirectoryHandle = {
  kind: "directory";
  name: string;
  values(): AsyncIterable<BrowserFileHandle | BrowserDirectoryHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<BrowserDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BrowserFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<BrowserDirectoryHandle>;
  __TAURI_INTERNALS__?: unknown;
};

const browserDirectories = new Map<string, BrowserDirectoryHandle>();
const isNative = () => Boolean((window as DirectoryPickerWindow).__TAURI_INTERNALS__);

export async function openHomeDirectory(): Promise<string> {
  if (isNative()) return invoke<string>("home_directory");

  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) {
    throw new Error("Folder access is not supported by this browser. Open Nova in the latest Chrome or Edge browser, or use the Windows/Linux desktop app.");
  }

  const handle = await picker({ mode: "readwrite" });
  const rootPath = `browser://${handle.name}`;
  browserDirectories.clear();
  browserDirectories.set(rootPath, handle);
  return rootPath;
}

export async function readDirectory(path: string): Promise<FileEntry[]> {
  if (isNative()) return invoke<FileEntry[]>("list_directory", { path });

  const directory = browserDirectories.get(path);
  if (!directory) {
    throw new Error("This folder permission is no longer available. Choose the folder again to continue.");
  }

  const entries: FileEntry[] = [];
  for await (const handle of directory.values()) {
    const childPath = `${path}/${handle.name}`;
    if (handle.kind === "directory") {
      browserDirectories.set(childPath, handle);
      entries.push({
        name: handle.name,
        path: childPath,
        isDir: true,
        size: 0,
        modifiedAt: null,
        extension: null
      });
    } else {
      const file = await handle.getFile();
      const extension = handle.name.includes(".") ? handle.name.split(".").pop() ?? null : null;
      entries.push({
        name: handle.name,
        path: childPath,
        isDir: false,
        size: file.size,
        modifiedAt: file.lastModified ? Math.floor(file.lastModified / 1000) : null,
        extension
      });
    }
  }

  return entries.sort((a, b) =>
    Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export async function openFile(path: string): Promise<void> {
  if (isNative()) return invoke<void>("open_file", { path });
  const separator = path.lastIndexOf("/");
  const parent = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const directory = browserDirectories.get(parent);
  if (!directory) throw new Error("Choose the parent folder again to restore access.");
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank");
  if (opened) opened.opener = null;
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("The browser blocked the preview tab. Allow pop-ups for this site and try again.");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}


async function browserEntryExists(parent: BrowserDirectoryHandle, name: string): Promise<boolean> {
  for (const kind of ["file", "directory"] as const) {
    try {
      if (kind === "file") await parent.getFileHandle(name);
      else await parent.getDirectoryHandle(name);
      return true;
    } catch (error) {
      if (!(error instanceof DOMException) || !["NotFoundError", "TypeMismatchError"].includes(error.name)) throw error;
    }
  }
  return false;
}

async function copyBrowserEntry(source: BrowserDirectoryHandle, sourceName: string, destination: BrowserDirectoryHandle, destinationName: string): Promise<void> {
  let fileHandle: BrowserFileHandle | null = null;
  let directoryHandle: BrowserDirectoryHandle | null = null;
  try { fileHandle = await source.getFileHandle(sourceName); }
  catch (error) {
    if (!(error instanceof DOMException) || !["NotFoundError", "TypeMismatchError"].includes(error.name)) throw error;
  }
  if (fileHandle) {
    const file = await fileHandle.getFile();
    const target = await destination.getFileHandle(destinationName, { create: true });
    const writable = await target.createWritable();
    try { await writable.write(file); await writable.close(); }
    catch (error) { await destination.removeEntry(destinationName).catch(() => undefined); throw error; }
    return;
  }
  directoryHandle = await source.getDirectoryHandle(sourceName);
  const targetDirectory = await destination.getDirectoryHandle(destinationName, { create: true });
  try {
    for await (const child of directoryHandle.values()) {
      await copyBrowserEntry(directoryHandle, child.name, targetDirectory, child.name);
    }
  } catch (error) {
    await destination.removeEntry(destinationName, { recursive: true }).catch(() => undefined);
    throw error;
  }
}

export async function copyEntry(path: string, destinationDirectory: string): Promise<string> {
  if (isNative()) return invoke<string>("copy_entry", { path, destinationDirectory });
  const separator = path.lastIndexOf("/");
  const parentPath = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const sourceParent = browserDirectories.get(parentPath);
  const destination = browserDirectories.get(destinationDirectory);
  if (!sourceParent || !destination) throw new Error("Choose the source and destination folders again to restore access.");
  if (await browserEntryExists(destination, name)) throw new Error("An item with that name already exists in the destination.");
  await copyBrowserEntry(sourceParent, name, destination, name);
  return `${destinationDirectory}/${name}`;
}

export async function moveEntry(path: string, destinationDirectory: string): Promise<string> {
  if (isNative()) return invoke<string>("move_entry", { path, destinationDirectory });
  const separator = path.lastIndexOf("/");
  const parentPath = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const sourceParent = browserDirectories.get(parentPath);
  const destination = browserDirectories.get(destinationDirectory);
  if (!sourceParent || !destination) throw new Error("Choose the source and destination folders again to restore access.");
  if (path === destinationDirectory || destinationDirectory.startsWith(`${path}/`)) {
    throw new Error("An item cannot be moved into itself or one of its subfolders.");
  }
  if (parentPath === destinationDirectory) return path;
  if (await browserEntryExists(destination, name)) throw new Error("An item with that name already exists in the destination.");
  await copyBrowserEntry(sourceParent, name, destination, name);
  await sourceParent.removeEntry(name, { recursive: true });
  for (const key of browserDirectories.keys()) {
    if (key === path || key.startsWith(`${path}/`)) browserDirectories.delete(key);
  }
  return `${destinationDirectory}/${name}`;
}

export async function renameEntry(path: string, newName: string): Promise<string> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw new Error("Enter a valid name without path separators.");
  }
  if (isNative()) return invoke<string>("rename_entry", { path, newName: trimmed });

  const separator = path.lastIndexOf("/");
  const parent = path.slice(0, separator);
  const oldName = path.slice(separator + 1);
  const directory = browserDirectories.get(parent);
  if (!directory) throw new Error("Choose the parent folder again to restore access.");
  if (oldName === trimmed) return path;

  // The File System Access API cannot rename directories. Files are copied
  // to the new name and removed only after the write has completed.
  if (browserDirectories.has(path)) {
    throw new Error("Folder renaming is not supported by this browser. Use the Windows desktop app.");
  }
  const source = await directory.getFileHandle(oldName);
  const file = await source.getFile();
  try {
    await directory.getFileHandle(trimmed);
    throw new Error("An item with that name already exists.");
  } catch (error) {
    if (error instanceof Error && error.message === "An item with that name already exists.") throw error;
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error;
  }
  const destination = await directory.getFileHandle(trimmed, { create: true });
  const writable = await destination.createWritable();
  try {
    await writable.write(file);
    await writable.close();
  } catch (error) {
    await directory.removeEntry(trimmed).catch(() => undefined);
    throw error;
  }
  await directory.removeEntry(oldName);
  return `${parent}/${trimmed}`;
}

export async function deleteEntry(path: string): Promise<void> {
  if (isNative()) return invoke<void>("delete_entry", { path });
  const separator = path.lastIndexOf("/");
  const parent = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const directory = browserDirectories.get(parent);
  if (!directory) throw new Error("Choose the parent folder again to restore access.");
  await directory.removeEntry(name, { recursive: true });
  for (const key of browserDirectories.keys()) {
    if (key === path || key.startsWith(`${path}/`)) browserDirectories.delete(key);
  }
}

export async function makeFolder(parent: string, name: string): Promise<string> {
  if (isNative()) return invoke<string>("create_folder", { parent, name });

  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw new Error("Enter a valid folder name");
  }

  const directory = browserDirectories.get(parent);
  if (!directory) throw new Error("Choose the parent folder again to restore access.");

  try {
    await directory.getDirectoryHandle(trimmed);
    throw new Error("A folder with that name already exists.");
  } catch (error) {
    if (error instanceof Error && error.message === "A folder with that name already exists.") throw error;
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error;
  }
  const child = await directory.getDirectoryHandle(trimmed, { create: true });
  const childPath = `${parent}/${trimmed}`;
  browserDirectories.set(childPath, child);
  return childPath;
}

export function parentDirectory(path: string): string {
  if (path.startsWith("browser://")) {
    const lastSlash = path.lastIndexOf("/");
    return lastSlash > "browser://".length ? path.slice(0, lastSlash) : path;
  }
  return path.replace(/[\\/]+$/, "").replace(/[\\/][^\\/]*$/, "") || path;
}

export function isBrowserFileMode(): boolean {
  return !isNative();
}
