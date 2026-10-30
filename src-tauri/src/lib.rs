use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified_at: Option<u64>,
    extension: Option<String>,
}

#[tauri::command]
fn home_directory() -> Result<String, String> {
    let path = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
        .map(PathBuf::from)
        .ok_or_else(|| "Could not determine the home directory".to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let directory = Path::new(&path);
    let metadata = fs::metadata(directory).map_err(|e| format!("Cannot access folder: {e}"))?;
    if !metadata.is_dir() {
        return Err("The selected path is not a folder".to_string());
    }

    let entries = fs::read_dir(directory).map_err(|e| format!("Cannot read folder: {e}"))?;
    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Cannot read folder entry: {e}"))?;
        let entry_path = entry.path();
        let metadata = match fs::symlink_metadata(&entry_path) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let file_type = metadata.file_type();
        let is_dir = file_type.is_dir();
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs());
        let name = entry.file_name().to_string_lossy().into_owned();
        let extension = if is_dir {
            None
        } else {
            entry_path.extension().map(|ext| ext.to_string_lossy().to_string())
        };

        result.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().into_owned(),
            is_dir,
            size: if is_dir { 0 } else { metadata.len() },
            modified_at,
            extension,
        });
    }

    result.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(result)
}

#[tauri::command]
fn create_folder(parent: String, name: String) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." || trimmed.contains(['/', '\\']) {
        return Err("Enter a valid folder name".to_string());
    }
    let parent_path = Path::new(&parent);
    if !parent_path.is_dir() {
        return Err("The destination folder is unavailable".to_string());
    }
    let new_path = parent_path.join(trimmed);
    fs::create_dir(&new_path).map_err(|e| format!("Could not create folder: {e}"))?;
    Ok(new_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn reveal_parent(path: String) -> Result<String, String> {
    let target = Path::new(&path);
    let parent = target.parent().ok_or_else(|| "No parent folder exists".to_string())?;
    Ok(parent.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            home_directory,
            list_directory,
            create_folder,
            reveal_parent
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nova AI File Manager");
}
