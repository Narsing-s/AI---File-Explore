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
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." || trimmed.contains('/') || trimmed.contains('\\') {
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


fn copy_path_safely(source: &Path, destination: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source).map_err(|e| format!("Cannot inspect source: {e}"))?;
    let kind = metadata.file_type();
    if kind.is_symlink() {
        return Err("Copying symbolic links is disabled for safety.".to_string());
    }
    if kind.is_file() {
        fs::copy(source, destination).map(|_| ()).map_err(|e| format!("Could not copy file: {e}"))
    } else if kind.is_dir() {
        fs::create_dir(destination).map_err(|e| format!("Could not create destination folder: {e}"))?;
        let entries = fs::read_dir(source).map_err(|e| format!("Could not read source folder: {e}"))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("Could not read source item: {e}"))?;
            let child_source = entry.path();
            let child_destination = destination.join(entry.file_name());
            if let Err(error) = copy_path_safely(&child_source, &child_destination) {
                let _ = fs::remove_dir_all(destination);
                return Err(error);
            }
        }
        Ok(())
    } else {
        Err("This item type cannot be copied.".to_string())
    }
}

fn destination_for(source: &Path, destination_directory: &Path) -> Result<PathBuf, String> {
    if !destination_directory.is_dir() {
        return Err("The destination folder is unavailable.".to_string());
    }
    let name = source.file_name().ok_or_else(|| "The selected item has no valid name.".to_string())?;
    let destination = destination_directory.join(name);
    if destination.exists() {
        return Err("An item with that name already exists in the destination.".to_string());
    }
    Ok(destination)
}

#[tauri::command]
fn copy_entry(path: String, destination_directory: String) -> Result<String, String> {
    let source = Path::new(&path);
    let source_metadata = fs::symlink_metadata(source).map_err(|e| format!("Cannot access source: {e}"))?;
    if !source_metadata.file_type().is_file() && !source_metadata.file_type().is_dir() {
        return Err("This item type cannot be copied.".to_string());
    }
    let destination_directory = Path::new(&destination_directory);
    let destination = destination_for(source, destination_directory)?;
    if source_metadata.file_type().is_dir() {
        let source_real = fs::canonicalize(source).map_err(|e| format!("Cannot resolve source folder: {e}"))?;
        let destination_real = fs::canonicalize(destination_directory).map_err(|e| format!("Cannot resolve destination folder: {e}"))?;
        if destination_real.starts_with(&source_real) {
            return Err("A folder cannot be copied into itself or one of its subfolders.".to_string());
        }
    }
    copy_path_safely(source, &destination)?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn move_entry(path: String, destination_directory: String) -> Result<String, String> {
    let source = Path::new(&path);
    let source_metadata = fs::symlink_metadata(source).map_err(|e| format!("Cannot access source: {e}"))?;
    if !source_metadata.file_type().is_file() && !source_metadata.file_type().is_dir() {
        return Err("This item type cannot be moved.".to_string());
    }
    let destination_directory = Path::new(&destination_directory);
    if source.parent() == Some(destination_directory) {
        return Ok(path);
    }
    let destination = destination_for(source, destination_directory)?;
    if source_metadata.file_type().is_dir() {
        let source_real = fs::canonicalize(source).map_err(|e| format!("Cannot resolve source folder: {e}"))?;
        let destination_real = fs::canonicalize(destination_directory).map_err(|e| format!("Cannot resolve destination folder: {e}"))?;
        if destination_real.starts_with(&source_real) {
            return Err("A folder cannot be moved into itself or one of its subfolders.".to_string());
        }
    }
    match fs::rename(source, &destination) {
        Ok(()) => Ok(destination.to_string_lossy().into_owned()),
        Err(_) => {
            copy_path_safely(source, &destination)?;
            let removal = if source_metadata.file_type().is_dir() {
                fs::remove_dir_all(source)
            } else {
                fs::remove_file(source)
            };
            if let Err(error) = removal {
                return Err(format!("The item was copied, but the original could not be removed: {error}. Both copies may now exist."));
            }
            Ok(destination.to_string_lossy().into_owned())
        }
    }
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    let target = Path::new(&path);
    if !target.is_file() {
        return Err("The selected file is unavailable or is not a regular file".to_string());
    }
    open::that(target).map_err(|e| format!("Could not open file with the system default application: {e}"))
}

#[tauri::command]
fn rename_entry(path: String, new_name: String) -> Result<String, String> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".."
        || trimmed.contains('/') || trimmed.contains('\\')
        || trimmed.chars().any(|c| c.is_control()) {
        return Err("Enter a valid name without path separators.".to_string());
    }
    let source = PathBuf::from(&path);
    let parent = source.parent().ok_or_else(|| "The selected item has no parent folder".to_string())?;
    let metadata = fs::symlink_metadata(&source).map_err(|e| format!("Cannot access selected item: {e}"))?;
    if !metadata.file_type().is_file() && !metadata.file_type().is_dir() && !metadata.file_type().is_symlink() {
        return Err("This item type cannot be renamed.".to_string());
    }
    let destination = parent.join(trimmed);
    if destination == source {
        return Ok(path);
    }
    if destination.exists() {
        return Err("An item with that name already exists.".to_string());
    }
    fs::rename(&source, &destination).map_err(|e| format!("Could not rename item: {e}"))?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn delete_entry(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    let metadata = fs::symlink_metadata(&target).map_err(|e| format!("Cannot access selected item: {e}"))?;
    let file_type = metadata.file_type();
    if file_type.is_symlink() || file_type.is_file() {
        fs::remove_file(&target).map_err(|e| format!("Could not delete file: {e}"))?;
    } else if file_type.is_dir() {
        fs::remove_dir_all(&target).map_err(|e| format!("Could not delete folder: {e}"))?;
    } else {
        return Err("This item type cannot be deleted.".to_string());
    }
    Ok(())
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
            copy_entry,
            move_entry,
            open_file,
            rename_entry,
            delete_entry,
            reveal_parent
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nova AI File Manager");
}


#[cfg(test)]
mod filesystem_tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn sandbox() -> PathBuf {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("nova-file-manager-test-{}-{nonce}", std::process::id()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn recursively_copies_folder_contents() {
        let root = sandbox();
        let source = root.join("source");
        let nested = source.join("nested");
        let destination = root.join("destination");
        fs::create_dir_all(&nested).unwrap();
        fs::create_dir_all(&destination).unwrap();
        fs::write(nested.join("hello.txt"), "hello nova").unwrap();

        let copied = copy_entry(source.to_string_lossy().into_owned(), destination.to_string_lossy().into_owned()).unwrap();
        assert_eq!(fs::read_to_string(Path::new(&copied).join("nested/hello.txt")).unwrap(), "hello nova");
        assert!(source.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn moves_file_and_preserves_contents() {
        let root = sandbox();
        let source_dir = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(&source_dir).unwrap();
        fs::create_dir_all(&destination).unwrap();
        let source = source_dir.join("notes.txt");
        fs::write(&source, "move me").unwrap();

        let moved = move_entry(source.to_string_lossy().into_owned(), destination.to_string_lossy().into_owned()).unwrap();
        assert!(!source.exists());
        assert_eq!(fs::read_to_string(moved).unwrap(), "move me");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn refuses_overwriting_existing_destination() {
        let root = sandbox();
        let source_dir = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(&source_dir).unwrap();
        fs::create_dir_all(&destination).unwrap();
        fs::write(source_dir.join("same.txt"), "source").unwrap();
        fs::write(destination.join("same.txt"), "destination").unwrap();

        let result = copy_entry(source_dir.join("same.txt").to_string_lossy().into_owned(), destination.to_string_lossy().into_owned());
        assert!(result.is_err());
        assert_eq!(fs::read_to_string(destination.join("same.txt")).unwrap(), "destination");
        fs::remove_dir_all(root).unwrap();
    }
}
