use notify::{Config as NotifyConfig, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tempfile::NamedTempFile;
use uuid::Uuid;
use walkdir::WalkDir;

const APP_FOLDER_NAME: &str = "ForgeBook";
const BACKUP_LIMIT: usize = 8;
const WATCH_EVENT_NAME: &str = "forgebook://vault-watch";

#[derive(Debug, thiserror::Error)]
enum DesktopError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Notify(#[from] notify::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopErrorPayload {
    code: String,
    message: String,
    details: Option<String>,
}

impl From<DesktopError> for DesktopErrorPayload {
    fn from(value: DesktopError) -> Self {
        Self {
            code: "forgebook_desktop_error".into(),
            message: value.to_string(),
            details: None,
        }
    }
}

impl From<std::io::Error> for DesktopErrorPayload {
    fn from(value: std::io::Error) -> Self {
        DesktopError::from(value).into()
    }
}

impl From<notify::Error> for DesktopErrorPayload {
    fn from(value: notify::Error) -> Self {
        DesktopError::from(value).into()
    }
}

impl From<serde_json::Error> for DesktopErrorPayload {
    fn from(value: serde_json::Error) -> Self {
        DesktopError::from(value).into()
    }
}

impl From<tauri::Error> for DesktopErrorPayload {
    fn from(value: tauri::Error) -> Self {
        DesktopError::from(value).into()
    }
}

type CommandResult<T> = Result<T, DesktopErrorPayload>;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct DesktopConfig {
    active_base_dir: Option<String>,
    recent_vault_roots: Vec<String>,
    last_opened_vault: Option<String>,
}

struct ForgeBookDesktopState {
    config_dir: PathBuf,
    config_path: PathBuf,
    config: Mutex<DesktopConfig>,
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppPathsPayload {
    root_dir: String,
    forgebook_dir: String,
    vaults_dir: String,
    app_config_dir: String,
    recent_vaults: Vec<String>,
    last_opened_vault: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryEntryPayload {
    path: String,
    kind: String,
    size: u64,
    modified_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchRegistrationPayload {
    watcher_id: String,
    path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchEventPayload {
    watcher_id: String,
    path: String,
    event_path: String,
    event: String,
    kind: String,
    timestamp: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultLoadPayload {
    root_path: String,
    entries: Vec<DirectoryEntryPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateStatusPayload {
    available: bool,
    current_version: String,
    version: String,
    notes: String,
    date: String,
    download_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInstallPayload {
    installed: bool,
    version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PathRequest {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteFileRequest {
    path: String,
    contents: String,
    atomic: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeletePathRequest {
    path: String,
    recursive: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListDirectoryRequest {
    path: String,
    recursive: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateDirectoryRequest {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MovePathRequest {
    from: String,
    to: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WatchPathRequest {
    path: String,
    recursive: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UnwatchPathRequest {
    watcher_id: String,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckRequest {
    current_version: Option<String>,
    feed_url: Option<String>,
}

fn now_timestamp_string() -> String {
    now_timestamp_for(SystemTime::now())
}

fn now_timestamp_for(time: SystemTime) -> String {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

fn default_base_dir(app: &AppHandle) -> Result<PathBuf, DesktopError> {
    app.path()
        .document_dir()
        .or_else(|_| app.path().home_dir())
        .map_err(|error| DesktopError::Message(format!("Could not resolve a default data directory: {error}")))
}

fn forgebook_root_from_base(base_dir: &Path) -> PathBuf {
    if base_dir.file_name().and_then(|name| name.to_str()) == Some(APP_FOLDER_NAME) {
        base_dir.to_path_buf()
    } else {
        base_dir.join(APP_FOLDER_NAME)
    }
}

fn base_dir_from_root(root: &Path) -> PathBuf {
    if root.file_name().and_then(|name| name.to_str()) == Some(APP_FOLDER_NAME) {
        root.parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| root.to_path_buf())
    } else {
        root.to_path_buf()
    }
}

fn forgebook_root_for_path(path: &Path) -> Option<PathBuf> {
    path.ancestors()
        .find(|ancestor| ancestor.file_name().and_then(|name| name.to_str()) == Some(APP_FOLDER_NAME))
        .map(Path::to_path_buf)
}

fn load_config(state: &ForgeBookDesktopState) -> Result<DesktopConfig, DesktopError> {
    state
        .config
        .lock()
        .map_err(|_| DesktopError::Message("Desktop config lock poisoned".into()))
        .map(|config| config.clone())
}

fn save_config(state: &ForgeBookDesktopState, next: &DesktopConfig) -> Result<(), DesktopError> {
    fs::create_dir_all(&state.config_dir)?;
    atomic_write_json(&state.config_path, next)?;
    let mut config = state
        .config
        .lock()
        .map_err(|_| DesktopError::Message("Desktop config lock poisoned".into()))?;
    *config = next.clone();
    Ok(())
}

fn ensure_forgebook_root(root: &Path) -> Result<(), DesktopError> {
    fs::create_dir_all(root.join("vaults"))?;
    fs::create_dir_all(root.join(".forgebook").join("backups"))?;
    fs::create_dir_all(root.join(".forgebook").join("conflicts"))?;
    Ok(())
}

fn push_recent_root(config: &mut DesktopConfig, forgebook_root: &Path) {
    let root_string = forgebook_root.to_string_lossy().to_string();
    config.recent_vault_roots.retain(|entry| entry != &root_string);
    config.recent_vault_roots.insert(0, root_string);
    config.recent_vault_roots.truncate(12);
}

fn remember_root(config: &mut DesktopConfig, forgebook_root: &Path) {
    config.active_base_dir = Some(base_dir_from_root(forgebook_root).to_string_lossy().to_string());
    push_recent_root(config, forgebook_root);
}

fn remember_loaded_vault(config: &mut DesktopConfig, vault_path: &Path) {
    config.last_opened_vault = Some(vault_path.to_string_lossy().to_string());
    if let Some(root) = forgebook_root_for_path(vault_path) {
        remember_root(config, &root);
    }
}

fn current_paths(app: &AppHandle, state: &ForgeBookDesktopState) -> Result<AppPathsPayload, DesktopError> {
    let config = load_config(state)?;
    let base_dir = config
        .active_base_dir
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or(default_base_dir(app)?);
    let forgebook_dir = forgebook_root_from_base(&base_dir);
    ensure_forgebook_root(&forgebook_dir)?;
    Ok(AppPathsPayload {
        root_dir: base_dir.to_string_lossy().to_string(),
        forgebook_dir: forgebook_dir.to_string_lossy().to_string(),
        vaults_dir: forgebook_dir.join("vaults").to_string_lossy().to_string(),
        app_config_dir: state.config_dir.to_string_lossy().to_string(),
        recent_vaults: config.recent_vault_roots.clone(),
        last_opened_vault: config.last_opened_vault.clone(),
    })
}

fn normalize_selected_root(selection: &Path) -> PathBuf {
    if selection.file_name().and_then(|name| name.to_str()) == Some(APP_FOLDER_NAME) {
        selection.to_path_buf()
    } else if selection.join("vaults").exists() || selection.join(".forgebook").exists() {
        selection.to_path_buf()
    } else {
        selection.join(APP_FOLDER_NAME)
    }
}

fn canonicalize_for_check(path: &Path) -> Result<PathBuf, DesktopError> {
    if path.exists() {
        return Ok(fs::canonicalize(path)?);
    }
    let parent = path
        .parent()
        .ok_or_else(|| DesktopError::Message("Path has no parent".into()))?;
    let canonical_parent = fs::canonicalize(parent)?;
    Ok(canonical_parent.join(path.file_name().unwrap_or_default()))
}

fn is_path_allowed(app: &AppHandle, state: &ForgeBookDesktopState, path: &Path) -> Result<(), DesktopError> {
    let config = load_config(state)?;
    let current_base = config
        .active_base_dir
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or(default_base_dir(app)?);

    let mut allowed_roots = vec![forgebook_root_from_base(&current_base), state.config_dir.clone()];
    allowed_roots.extend(config.recent_vault_roots.into_iter().map(PathBuf::from));

    let candidate = canonicalize_for_check(path)?;
    if allowed_roots
        .into_iter()
        .filter_map(|root| canonicalize_for_check(&root).ok())
        .any(|root| candidate.starts_with(root))
    {
        Ok(())
    } else {
        Err(DesktopError::Message(format!(
            "Unsafe path blocked: {}",
            path.to_string_lossy()
        )))
    }
}

fn ensure_parent(path: &Path) -> Result<(), DesktopError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

fn relative_to_vault_root(path: &Path) -> PathBuf {
    let components = path.components().collect::<Vec<_>>();
    if let Some(index) = components
        .iter()
        .position(|component| component.as_os_str() == APP_FOLDER_NAME)
    {
        return components[index + 1..]
            .iter()
            .fold(PathBuf::new(), |mut acc, part| {
                acc.push(part.as_os_str());
                acc
            });
    }
    path.file_name()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("item"))
}

fn backup_directory_for(path: &Path) -> PathBuf {
    let mut cursor = path.parent();
    while let Some(current) = cursor {
        if current.join(".forgebook").exists() {
            return current.join(".forgebook").join("backups");
        }
        cursor = current.parent();
    }
    path.parent()
        .unwrap_or_else(|| Path::new("."))
        .join(".forgebook")
        .join("backups")
}

fn prune_backups(backup_root: &Path, prefix: &str) -> Result<(), DesktopError> {
    let mut matching = Vec::new();
    for entry in fs::read_dir(backup_root)? {
        let entry = entry?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with(prefix) {
            matching.push(entry.path());
        }
    }
    matching.sort();
    if matching.len() > BACKUP_LIMIT {
        let trim_count = matching.len() - BACKUP_LIMIT;
        for path in matching.into_iter().take(trim_count) {
            let _ = if path.is_dir() {
                fs::remove_dir_all(path)
            } else {
                fs::remove_file(path)
            };
        }
    }
    Ok(())
}

fn copy_dir_recursive(from: &Path, to: &Path) -> Result<(), DesktopError> {
    fs::create_dir_all(to)?;
    for entry in WalkDir::new(from).min_depth(1) {
        let entry = entry.map_err(|error| DesktopError::Message(error.to_string()))?;
        let relative = entry
            .path()
            .strip_prefix(from)
            .map_err(|error| DesktopError::Message(error.to_string()))?;
        let target = to.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)?;
        } else {
            ensure_parent(&target)?;
            fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}

fn create_backup(path: &Path) -> Result<(), DesktopError> {
    if !path.exists() {
        return Ok(());
    }

    let backup_root = backup_directory_for(path);
    fs::create_dir_all(&backup_root)?;

    let relative = relative_to_vault_root(path);
    let stem = relative.to_string_lossy().replace(['\\', '/', ':'], "__");
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let backup_path = if path.is_dir() {
        backup_root.join(format!("{stem}-{stamp}"))
    } else {
        backup_root.join(format!("{stem}-{stamp}.bak"))
    };

    if path.is_dir() {
        copy_dir_recursive(path, &backup_path)?;
    } else {
        fs::copy(path, &backup_path)?;
    }

    prune_backups(&backup_root, &stem)?;
    Ok(())
}

fn atomic_write_text(path: &Path, contents: &str) -> Result<(), DesktopError> {
    ensure_parent(path)?;
    create_backup(path)?;

    let parent = path
        .parent()
        .ok_or_else(|| DesktopError::Message("Write target has no parent directory".into()))?;

    let mut temp = NamedTempFile::new_in(parent)?;
    temp.write_all(contents.as_bytes())?;
    temp.flush()?;

    if path.exists() {
        fs::remove_file(path)?;
    }

    temp.persist(path)
        .map_err(|error| DesktopError::Io(error.error))?;
    Ok(())
}

fn write_text(path: &Path, contents: &str, atomic: bool) -> Result<(), DesktopError> {
    if atomic {
        return atomic_write_text(path, contents);
    }
    ensure_parent(path)?;
    create_backup(path)?;
    fs::write(path, contents)?;
    Ok(())
}

fn atomic_write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), DesktopError> {
    atomic_write_text(path, &serde_json::to_string_pretty(value)?)
}

fn entry_payload(path: &Path) -> Result<DirectoryEntryPayload, DesktopError> {
    let metadata = fs::metadata(path)?;
    Ok(DirectoryEntryPayload {
        path: path.to_string_lossy().to_string(),
        kind: if metadata.is_dir() {
            "directory".into()
        } else {
            "file".into()
        },
        size: if metadata.is_file() { metadata.len() } else { 0 },
        modified_at: metadata
            .modified()
            .map(now_timestamp_for)
            .unwrap_or_else(|_| now_timestamp_string()),
    })
}

fn directory_entries(path: &Path, recursive: bool) -> Result<Vec<DirectoryEntryPayload>, DesktopError> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let walker = if recursive {
        WalkDir::new(path)
    } else {
        WalkDir::new(path).max_depth(1)
    };

    let mut entries = Vec::new();
    for entry in walker.into_iter().filter_map(Result::ok) {
        let current = entry.path();
        if current == path {
            continue;
        }
        entries.push(entry_payload(current)?);
    }
    Ok(entries)
}

fn map_watch_event_kind(kind: &EventKind) -> (&'static str, &'static str) {
    match kind {
        EventKind::Create(_) => ("file_added", "create"),
        EventKind::Remove(_) => ("file_deleted", "remove"),
        EventKind::Modify(_) => ("file_changed", "modify"),
        _ => ("file_changed", "other"),
    }
}

fn move_path_safe(from: &Path, to: &Path) -> Result<(), DesktopError> {
    ensure_parent(to)?;
    create_backup(to)?;

    match fs::rename(from, to) {
        Ok(_) => Ok(()),
        Err(_) => {
            if from.is_dir() {
                copy_dir_recursive(from, to)?;
                fs::remove_dir_all(from)?;
            } else {
                fs::copy(from, to)?;
                fs::remove_file(from)?;
            }
            Ok(())
        }
    }
}

#[tauri::command]
fn forgebook_get_app_paths(
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<AppPathsPayload> {
    current_paths(&app, &state).map_err(Into::into)
}

#[tauri::command]
fn forgebook_list_recent_vaults(state: State<'_, ForgeBookDesktopState>) -> CommandResult<Vec<String>> {
    load_config(&state)
        .map(|config| config.recent_vault_roots)
        .map_err(Into::into)
}

#[tauri::command]
fn forgebook_select_vault_folder(
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<Option<AppPathsPayload>> {
    let selected = app.dialog().file().blocking_pick_folder();
    let Some(file_path) = selected else {
        return Ok(None);
    };

    let selected_path = file_path
        .into_path()
        .map_err(|error| DesktopError::Message(error.to_string()))?;
    let forgebook_root = normalize_selected_root(&selected_path);
    ensure_forgebook_root(&forgebook_root)?;

    let mut config = load_config(&state)?;
    remember_root(&mut config, &forgebook_root);
    save_config(&state, &config)?;

    current_paths(&app, &state).map(Some).map_err(Into::into)
}

#[tauri::command]
fn forgebook_create_vault(
    request: PathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<VaultLoadPayload> {
    let vault_root = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &vault_root)?;

    for segment in [
        "folders",
        "notes",
        "boards",
        "docs",
        "files",
        ".forgebook/backups",
        ".forgebook/conflicts",
    ] {
        fs::create_dir_all(vault_root.join(segment))?;
    }

    let settings_path = vault_root.join(".forgebook").join("settings.json");
    if !settings_path.exists() {
        atomic_write_text(&settings_path, "{}")?;
    }

    let database_path = vault_root.join(".forgebook").join("vault.db");
    if !database_path.exists() {
        write_text(&database_path, "", false)?;
    }

    forgebook_load_vault(
        PathRequest {
            path: vault_root.to_string_lossy().to_string(),
        },
        app,
        state,
    )
}

#[tauri::command]
fn forgebook_load_vault(
    request: PathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<VaultLoadPayload> {
    let vault_root = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &vault_root)?;

    let entries = directory_entries(&vault_root, true)?;
    let mut config = load_config(&state)?;
    remember_loaded_vault(&mut config, &vault_root);
    save_config(&state, &config)?;

    Ok(VaultLoadPayload {
        root_path: vault_root.to_string_lossy().to_string(),
        entries,
    })
}

#[tauri::command]
fn forgebook_read_file(
    request: PathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<Option<String>> {
    let path = PathBuf::from(request.path);
    is_path_allowed(&app, &state, &path)?;
    match fs::read_to_string(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

#[tauri::command]
fn forgebook_write_file(
    request: WriteFileRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<DirectoryEntryPayload> {
    let path = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &path)?;
    write_text(&path, &request.contents, request.atomic.unwrap_or(true))?;
    entry_payload(&path).map_err(Into::into)
}

#[tauri::command]
fn forgebook_delete_file(
    request: DeletePathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<bool> {
    let path = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &path)?;

    if path.is_file() && path.exists() {
        create_backup(&path)?;
        fs::remove_file(path)?;
        return Ok(true);
    }

    if path.is_dir() && path.exists() {
        create_backup(&path)?;
        if request.recursive.unwrap_or(false) {
            fs::remove_dir_all(path)?;
        } else {
            fs::remove_dir(path)?;
        }
    }

    Ok(true)
}

#[tauri::command]
fn forgebook_list_directory(
    request: ListDirectoryRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<Vec<DirectoryEntryPayload>> {
    let path = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &path)?;
    directory_entries(&path, request.recursive.unwrap_or(true)).map_err(Into::into)
}

#[tauri::command]
fn forgebook_create_directory(
    request: CreateDirectoryRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<bool> {
    let path = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &path)?;
    fs::create_dir_all(path)?;
    Ok(true)
}

#[tauri::command]
fn forgebook_move_file(
    request: MovePathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<bool> {
    let from_path = PathBuf::from(&request.from);
    let to_path = PathBuf::from(&request.to);
    is_path_allowed(&app, &state, &from_path)?;
    is_path_allowed(&app, &state, &to_path)?;
    move_path_safe(&from_path, &to_path)?;
    Ok(true)
}

#[tauri::command]
fn forgebook_copy_file(
    request: MovePathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<bool> {
    let from_path = PathBuf::from(&request.from);
    let to_path = PathBuf::from(&request.to);
    is_path_allowed(&app, &state, &from_path)?;
    is_path_allowed(&app, &state, &to_path)?;

    if from_path.is_dir() {
        copy_dir_recursive(&from_path, &to_path)?;
    } else {
        ensure_parent(&to_path)?;
        create_backup(&to_path)?;
        fs::copy(from_path, to_path)?;
    }

    Ok(true)
}

#[tauri::command]
fn forgebook_watch_path(
    request: WatchPathRequest,
    app: AppHandle,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<WatchRegistrationPayload> {
    let watch_path = PathBuf::from(&request.path);
    is_path_allowed(&app, &state, &watch_path)?;

    let watcher_id = Uuid::new_v4().to_string();
    let app_handle = app.clone();
    let watched_root = watch_path.clone();
    let watcher_id_for_event = watcher_id.clone();

    let mut watcher = RecommendedWatcher::new(
        move |event: notify::Result<Event>| {
            if let Ok(event) = event {
                let (event_name, kind_name) = map_watch_event_kind(&event.kind);
                for changed_path in event.paths {
                    let payload = WatchEventPayload {
                        watcher_id: watcher_id_for_event.clone(),
                        path: watched_root.to_string_lossy().to_string(),
                        event_path: changed_path.to_string_lossy().to_string(),
                        event: event_name.to_string(),
                        kind: kind_name.to_string(),
                        timestamp: now_timestamp_string(),
                    };
                    let _ = app_handle.emit(WATCH_EVENT_NAME, payload);
                }
            }
        },
        NotifyConfig::default(),
    )?;

    watcher.watch(
        &watch_path,
        if request.recursive.unwrap_or(true) {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        },
    )?;

    state
        .watchers
        .lock()
        .map_err(|_| DesktopError::Message("Watcher registry lock poisoned".into()))?
        .insert(watcher_id.clone(), watcher);

    Ok(WatchRegistrationPayload {
        watcher_id,
        path: request.path,
    })
}

#[tauri::command]
fn forgebook_unwatch_path(
    request: UnwatchPathRequest,
    state: State<'_, ForgeBookDesktopState>,
) -> CommandResult<bool> {
    state
        .watchers
        .lock()
        .map_err(|_| DesktopError::Message("Watcher registry lock poisoned".into()))?
        .remove(&request.watcher_id);
    Ok(true)
}

#[tauri::command]
fn forgebook_check_for_updates(
    request: UpdateCheckRequest,
    app: AppHandle,
) -> CommandResult<UpdateStatusPayload> {
    let current_version = request
        .current_version
        .unwrap_or_else(|| app.package_info().version.to_string());
    let _ = request.feed_url;
    Err(DesktopError::Message(format!(
        "Desktop updater is not configured for version {current_version}"
    ))
    .into())
}

#[tauri::command]
fn forgebook_install_update(app: AppHandle) -> CommandResult<UpdateInstallPayload> {
    Ok(UpdateInstallPayload {
        installed: false,
        version: app.package_info().version.to_string(),
    })
}

#[tauri::command]
fn forgebook_restart_app(app: AppHandle) -> CommandResult<bool> {
    app.request_restart();
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let config_dir = app.path().app_config_dir().map_err(|error| {
                DesktopError::Message(format!("Could not resolve app config directory: {error}"))
            })?;
            fs::create_dir_all(&config_dir)?;
            let config_path = config_dir.join("desktop-state.json");
            let config = if config_path.exists() {
                fs::read_to_string(&config_path)
                    .ok()
                    .and_then(|raw| serde_json::from_str::<DesktopConfig>(&raw).ok())
                    .unwrap_or_default()
            } else {
                DesktopConfig::default()
            };

            app.manage(ForgeBookDesktopState {
                config_dir,
                config_path,
                config: Mutex::new(config),
                watchers: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            forgebook_get_app_paths,
            forgebook_list_recent_vaults,
            forgebook_select_vault_folder,
            forgebook_create_vault,
            forgebook_load_vault,
            forgebook_read_file,
            forgebook_write_file,
            forgebook_delete_file,
            forgebook_list_directory,
            forgebook_create_directory,
            forgebook_move_file,
            forgebook_copy_file,
            forgebook_watch_path,
            forgebook_unwatch_path,
            forgebook_check_for_updates,
            forgebook_install_update,
            forgebook_restart_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ForgeBook desktop application");
}
