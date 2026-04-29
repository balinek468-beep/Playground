import { ENV, isSupabaseConfigured } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

const STORAGE_KIND = "storage";
const STORAGE_PREFIX = "storage";
const STORAGE_RECOVERY_QUEUE_KEY = "forgebook-storage-recovery-v1";

function requireClient() {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for storage sync.");
  }
  return client;
}

function isoNow() {
  return new Date().toISOString();
}

function safeFileName(name = "file") {
  return String(name || "file")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "file";
}

function fileExtension(name = "") {
  const value = String(name || "");
  const dot = value.lastIndexOf(".");
  if (dot < 0) return "";
  return value.slice(dot + 1).toLowerCase();
}

function deriveFileType(file) {
  const mime = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/pdf/.test(mime) || name.endsWith(".pdf")) return "pdf";
  if (/sheet|excel|csv/.test(mime) || /\.(csv|xls|xlsx)$/.test(name)) return "sheet";
  if (/json|xml|yaml|toml|javascript|typescript|python|html|css|text/.test(mime) || /\.(json|xml|ya?ml|toml|js|jsx|ts|tsx|py|html|css|txt|md)$/.test(name)) return "source";
  if (/zip|archive|compressed/.test(mime) || /\.(zip|rar|7z|tar|gz)$/.test(name)) return "archive";
  return "file";
}

function randomSegment() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function storageObjectPath(userId, fileName) {
  const safeName = safeFileName(fileName);
  return `${STORAGE_PREFIX}/${userId}/${Date.now()}-${randomSegment()}-${safeName}`;
}

function toProgressValue(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(1, next));
}

function emitProgress(callback, stage, progress, extras = {}) {
  if (typeof callback !== "function") return;
  callback({ stage, progress: toProgressValue(progress), ...extras });
}

function publicUrlFor(client, path) {
  const { data } = client.storage.from(ENV.assetBucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("ForgeBook storage recovery read failed", error);
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("ForgeBook storage recovery write failed", error);
    return false;
  }
}

function readRecoveryQueue() {
  const raw = safeLocalStorageGet(STORAGE_RECOVERY_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("ForgeBook storage recovery queue is corrupted", error);
    return [];
  }
}

function writeRecoveryQueue(entries) {
  safeLocalStorageSet(STORAGE_RECOVERY_QUEUE_KEY, JSON.stringify(entries || []));
}

function upsertRecoveryEntry(entry) {
  if (!entry?.recoveryId) return;
  const queue = readRecoveryQueue();
  const next = queue.filter((candidate) => candidate?.recoveryId !== entry.recoveryId);
  next.unshift(entry);
  writeRecoveryQueue(next.slice(0, 100));
}

function removeRecoveryEntry(recoveryId) {
  if (!recoveryId) return;
  const queue = readRecoveryQueue().filter((entry) => entry?.recoveryId !== recoveryId);
  writeRecoveryQueue(queue);
}

function mergeMetadata(base, patch) {
  const left = base && typeof base === "object" ? base : {};
  const right = patch && typeof patch === "object" ? patch : {};
  return { ...left, ...right };
}

async function fetchStorageAssets(client, userId) {
  const { data, error } = await client
    .from("uploaded_assets")
    .select("id, owner_id, bucket, path, public_url, kind, created_at")
    .eq("owner_id", userId)
    .eq("bucket", ENV.assetBucket);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageFolders(client, userId) {
  const { data, error } = await client
    .from("storage_folders")
    .select("id, owner_id, workspace_id, parent_id, name, kind, is_archived, is_pinned, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageCategories(client, userId) {
  const { data, error } = await client
    .from("storage_categories")
    .select("id, owner_id, name, color, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageItems(client, userId) {
  const { data, error } = await client
    .from("storage_items")
    .select("id, owner_id, folder_id, category_id, asset_id, name, mime_type, file_ext, size_bytes, tags, metadata, is_favorite, is_pinned, is_archived, deleted_at, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageVersions(client, userId) {
  const { data, error } = await client
    .from("storage_versions")
    .select("id, storage_item_id, asset_id, version_number, created_by, created_at")
    .order("version_number", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageLinks(client, userId) {
  const { data, error } = await client
    .from("storage_links")
    .select("id, storage_item_id, link_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchStorageActivity(client, userId) {
  const { data, error } = await client
    .from("storage_activity")
    .select("id, storage_item_id, actor_id, event_type, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function mapStorageLibrary({ userId, items, folders, categories, versions, links, activity, assets }) {
  const assetById = new Map(assets.map((entry) => [entry.id, entry]));
  const versionsByItemId = new Map();
  versions.forEach((version) => {
    const next = versionsByItemId.get(version.storage_item_id) || [];
    next.push(version);
    versionsByItemId.set(version.storage_item_id, next);
  });
  const linksByItemId = new Map();
  links.forEach((link) => {
    const next = linksByItemId.get(link.storage_item_id) || [];
    next.push(link);
    linksByItemId.set(link.storage_item_id, next);
  });
  const activityByItemId = new Map();
  activity.forEach((entry) => {
    const next = activityByItemId.get(entry.storage_item_id) || [];
    next.push(entry);
    activityByItemId.set(entry.storage_item_id, next);
  });

  return {
    files: items.map((item) => {
      const itemVersions = (versionsByItemId.get(item.id) || [])
        .map((version) => ({
          ...version,
          asset: version.asset_id ? assetById.get(version.asset_id) || null : null,
        }))
        .sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0));
      const primaryAsset = item.asset_id ? assetById.get(item.asset_id) || null : (itemVersions[0]?.asset || null);
      const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
      return {
        id: item.id,
        storageItemId: item.id,
        storageVersionId: itemVersions[0]?.id || null,
        assetId: primaryAsset?.id || item.asset_id || null,
        remoteId: item.id,
        remote: true,
        name: item.name || "Untitled file",
        type: String(metadata.file_type || deriveFileType({ type: item.mime_type || "", name: item.name || "" })).toUpperCase(),
        fileType: metadata.file_type || deriveFileType({ type: item.mime_type || "", name: item.name || "" }),
        mimeType: item.mime_type || "",
        size: Number(item.size_bytes || 0),
        storagePath: metadata.storage_path || primaryAsset?.path || "",
        downloadUrl: metadata.public_url || primaryAsset?.public_url || "",
        preview: metadata.preview_url || metadata.public_url || primaryAsset?.public_url || "",
        folderId: item.folder_id || null,
        categoryId: item.category_id || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        labels: Array.isArray(metadata.labels) ? metadata.labels : [],
        favorite: Boolean(item.is_favorite),
        pinned: Boolean(item.is_pinned),
        shared: Boolean(metadata.shared),
        archived: Boolean(item.is_archived),
        deletedAt: item.deleted_at || null,
        ownerId: item.owner_id || userId,
        workspaceId: metadata.workspace_id || null,
        linkedIds: (linksByItemId.get(item.id) || []).map((link) => link.target_id).filter(Boolean),
        links: linksByItemId.get(item.id) || [],
        version: Number(itemVersions[0]?.version_number || metadata.version_number || 1),
        versions: itemVersions.map((version) => ({
          id: version.id,
          versionNumber: version.version_number,
          createdAt: version.created_at,
          storagePath: version.asset?.path || "",
          publicUrl: version.asset?.public_url || "",
          size: Number(version.asset?.size_bytes || item.size_bytes || 0),
          mimeType: version.asset?.mime_type || item.mime_type || "",
        })),
        extension: item.file_ext || fileExtension(item.name || ""),
        uploadStatus: metadata.status || (item.deleted_at ? "trashed" : "synced"),
        syncError: metadata.last_error || "",
        progress: 1,
        createdAt: Date.parse(item.created_at || isoNow()),
        updatedAt: Date.parse(item.updated_at || item.created_at || isoNow()),
        activity: activityByItemId.get(item.id) || [],
      };
    }),
    folders: folders.map((folder) => ({
      id: folder.id,
      remoteId: folder.id,
      ownerId: folder.owner_id || userId,
      workspaceId: folder.workspace_id || null,
      parentId: folder.parent_id || null,
      name: folder.name || "New Folder",
      pinned: Boolean(folder.is_pinned),
      archived: Boolean(folder.is_archived),
      createdAt: Date.parse(folder.created_at || isoNow()),
      updatedAt: Date.parse(folder.updated_at || folder.created_at || isoNow()),
      presetId: "",
    })),
    categories: categories.map((category) => ({
      id: category.id,
      remoteId: category.id,
      ownerId: category.owner_id || userId,
      name: category.name || "Category",
      color: category.color || "#8b5cf6",
      createdAt: Date.parse(category.created_at || isoNow()),
      updatedAt: Date.parse(category.updated_at || category.created_at || isoNow()),
    })),
    versions: versions.map((version) => ({
      id: version.id,
      storageItemId: version.storage_item_id,
      assetId: version.asset_id || null,
      versionNumber: version.version_number || 1,
      createdBy: version.created_by || null,
      createdAt: version.created_at || isoNow(),
      storagePath: assetById.get(version.asset_id)?.path || "",
      publicUrl: assetById.get(version.asset_id)?.public_url || "",
    })),
    links,
    activity,
  };
}

export async function fetchStorageLibrary(userId) {
  if (!userId) {
    return { files: [], folders: [], categories: [], versions: [], links: [], activity: [] };
  }
  const client = requireClient();
  const [items, folders, categories, versions, links, activity, assets] = await Promise.all([
    fetchStorageItems(client, userId),
    fetchStorageFolders(client, userId),
    fetchStorageCategories(client, userId),
    fetchStorageVersions(client, userId),
    fetchStorageLinks(client, userId),
    fetchStorageActivity(client, userId),
    fetchStorageAssets(client, userId),
  ]);
  return mapStorageLibrary({ userId, items, folders, categories, versions, links, activity, assets });
}

export async function createStorageFolderRecord({ userId, name, parentId = null, workspaceId = null }) {
  const client = requireClient();
  const payload = {
    owner_id: userId,
    workspace_id: workspaceId,
    parent_id: parentId,
    name,
    kind: "folder",
    updated_at: isoNow(),
  };
  const { data, error } = await client.from("storage_folders").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function createStorageCategoryRecord({ userId, name, color = "#8b5cf6" }) {
  const client = requireClient();
  const payload = {
    owner_id: userId,
    name,
    color,
    updated_at: isoNow(),
  };
  const { data, error } = await client.from("storage_categories").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function insertUploadedAssetRow(client, { userId, path, publicUrl }) {
  const payload = {
    owner_id: userId,
    bucket: ENV.assetBucket,
    path,
    public_url: publicUrl,
    kind: STORAGE_KIND,
  };
  const { data, error } = await client.from("uploaded_assets").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function insertStorageItemRow(client, payload) {
  const { data, error } = await client.from("storage_items").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function updateStorageItemRow(client, itemId, payload) {
  const { data, error } = await client.from("storage_items").update(payload).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}

async function insertStorageVersionRow(client, payload) {
  const { data, error } = await client.from("storage_versions").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function insertStorageActivityRow(client, payload) {
  const { error } = await client.from("storage_activity").insert(payload);
  if (error) throw error;
}

async function fetchStorageItemRow(client, itemId) {
  const { data, error } = await client
    .from("storage_items")
    .select("id, owner_id, folder_id, category_id, asset_id, name, mime_type, file_ext, size_bytes, tags, metadata, deleted_at, created_at, updated_at")
    .eq("id", itemId)
    .single();
  if (error) throw error;
  return data;
}

async function insertStorageLinks(client, itemId, linkedTargets = []) {
  const deduped = [...new Set((Array.isArray(linkedTargets) ? linkedTargets : []).filter(Boolean))];
  if (!deduped.length) return [];
  const payload = deduped.map((targetId) => ({
    storage_item_id: itemId,
    link_type: "document",
    target_id: targetId,
    metadata: {},
  }));
  const { data, error } = await client.from("storage_links").insert(payload).select();
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function uploadStorageFile({
  userId,
  file,
  folderId = null,
  categoryId = null,
  tags = [],
  linkedTargets = [],
  workspaceId = null,
  existingItemId = null,
  existingVersion = 0,
  onProgress,
}) {
  if (!userId) throw new Error("A signed-in user is required for storage sync.");
  if (!file) throw new Error("No file provided for upload.");

  const client = requireClient();
  const path = storageObjectPath(userId, file.name);
  const fileType = deriveFileType(file);
  const startedAt = isoNow();
  const recoveryId = `${userId}:${path}`;

  upsertRecoveryEntry({
    recoveryId,
    userId,
    path,
    publicUrl: "",
    uploadedAt: startedAt,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileExt: fileExtension(file.name),
    size: Number(file.size || 0),
    fileType,
    folderId,
    categoryId,
    tags,
    linkedTargets,
    workspaceId,
    existingItemId,
    existingVersion,
  });

  emitProgress(onProgress, "pending", 0.05);
  emitProgress(onProgress, "uploading", 0.18, { path });

  const { error: uploadError } = await client.storage.from(ENV.assetBucket).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) {
    const error = new Error(uploadError.message || "Storage upload failed.");
    error.stage = "upload";
    error.cause = uploadError;
    throw error;
  }

  const publicUrl = publicUrlFor(client, path);
  upsertRecoveryEntry({
    recoveryId,
    userId,
    path,
    publicUrl,
    uploadedAt: startedAt,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileExt: fileExtension(file.name),
    size: Number(file.size || 0),
    fileType,
    folderId,
    categoryId,
    tags,
    linkedTargets,
    workspaceId,
    existingItemId,
    existingVersion,
  });
  emitProgress(onProgress, "uploaded", 0.58, { path, publicUrl });

  let assetRecord = null;
  try {
    assetRecord = await insertUploadedAssetRow(client, { userId, path, publicUrl });
  } catch (error) {
    const metadataError = new Error(error.message || "Asset metadata insert failed.");
    metadataError.stage = "asset-metadata";
    metadataError.cause = error;
    metadataError.recovery = {
      recoveryId,
      path,
      publicUrl,
      uploadedAt: startedAt,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileExt: fileExtension(file.name),
      size: Number(file.size || 0),
      fileType,
      folderId,
      categoryId,
      tags,
      linkedTargets,
      workspaceId,
      existingItemId,
      existingVersion,
    };
    throw metadataError;
  }

  const result = await syncUploadedStorageMetadata({
    userId,
    assetRecord,
    file,
    folderId,
    categoryId,
    tags,
    linkedTargets,
    workspaceId,
    existingItemId,
    existingVersion,
    onProgress,
    createdAt: startedAt,
    recoveryId,
  });
  removeRecoveryEntry(recoveryId);
  return result;
}

export async function syncUploadedStorageMetadata({
  userId,
  assetRecord,
  file,
  folderId = null,
  categoryId = null,
  tags = [],
  linkedTargets = [],
  workspaceId = null,
  existingItemId = null,
  existingVersion = 0,
  onProgress,
  createdAt = isoNow(),
  recoveryId = "",
}) {
  const client = requireClient();
  if (!assetRecord?.id || !assetRecord?.path) {
    const error = new Error("Missing uploaded asset record for metadata sync.");
    error.stage = "metadata";
    throw error;
  }

  emitProgress(onProgress, "syncing-metadata", 0.72, { assetId: assetRecord.id });

  const metadata = {
    status: "synced",
    storage_path: assetRecord.path,
    public_url: assetRecord.public_url || publicUrlFor(client, assetRecord.path),
    file_type: deriveFileType(file),
    preview_url: assetRecord.public_url || publicUrlFor(client, assetRecord.path),
    workspace_id: workspaceId || null,
    last_synced_at: isoNow(),
    synced_via: "supabase",
    labels: [],
    shared: false,
    last_error: null,
  };

  let itemRecord;
  let versionNumber = Math.max(1, Number(existingVersion || 0) + 1);
  try {
    if (existingItemId) {
      itemRecord = await updateStorageItemRow(client, existingItemId, {
        asset_id: assetRecord.id,
        folder_id: folderId,
        category_id: categoryId,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_ext: fileExtension(file.name),
        size_bytes: Number(file.size || 0),
        tags,
        metadata,
        updated_at: isoNow(),
      });
    } else {
      itemRecord = await insertStorageItemRow(client, {
        owner_id: userId,
        folder_id: folderId,
        category_id: categoryId,
        asset_id: assetRecord.id,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_ext: fileExtension(file.name),
        size_bytes: Number(file.size || 0),
        tags,
        metadata,
        updated_at: isoNow(),
      });
      versionNumber = 1;
    }
  } catch (error) {
    const metadataError = new Error(error.message || "Storage item metadata sync failed.");
    metadataError.stage = "item-metadata";
    metadataError.cause = error;
    metadataError.recovery = {
      recoveryId: recoveryId || `${userId}:${assetRecord.path}`,
      assetRecord,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: Number(file.size || 0),
      folderId,
      categoryId,
      tags,
      linkedTargets,
      workspaceId,
      existingItemId,
      existingVersion,
      createdAt,
      path: assetRecord.path,
      publicUrl: assetRecord.public_url || publicUrlFor(client, assetRecord.path),
    };
    upsertRecoveryEntry(metadataError.recovery);
    throw metadataError;
  }

  const versionRecord = await insertStorageVersionRow(client, {
    storage_item_id: itemRecord.id,
    asset_id: assetRecord.id,
    version_number: versionNumber,
    created_by: userId,
  });

  if (!existingItemId && linkedTargets.length) {
    await insertStorageLinks(client, itemRecord.id, linkedTargets);
  }

  await insertStorageActivityRow(client, {
    storage_item_id: itemRecord.id,
    actor_id: userId,
    event_type: existingItemId ? "version_created" : "uploaded",
    metadata: {
      asset_id: assetRecord.id,
      path: assetRecord.path,
      version_number: versionNumber,
      linked_targets: linkedTargets,
    },
  });

  emitProgress(onProgress, "synced", 1, { itemId: itemRecord.id, versionId: versionRecord.id });

  return {
    itemId: itemRecord.id,
    versionId: versionRecord.id,
    assetId: assetRecord.id,
    path: assetRecord.path,
    publicUrl: assetRecord.public_url || publicUrlFor(client, assetRecord.path),
    versionNumber,
    createdAt,
    updatedAt: itemRecord.updated_at || isoNow(),
    metadata: itemRecord.metadata || metadata,
  };
}

export async function registerUploadedStorageAsset({ userId, path, publicUrl = "" }) {
  const client = requireClient();
  return insertUploadedAssetRow(client, { userId, path, publicUrl: publicUrl || publicUrlFor(client, path) });
}

export async function retryStorageMetadataSync({ userId, recovery }) {
  if (!recovery) throw new Error("Missing storage recovery payload.");
  const recoveryId = recovery.recoveryId || `${userId}:${recovery.path || recovery.assetRecord?.path || recovery.existingItemId || randomSegment()}`;
  const assetRecord = recovery.assetRecord || await registerUploadedStorageAsset({
    userId,
    path: recovery.path,
    publicUrl: recovery.publicUrl || "",
  });
  const result = await syncUploadedStorageMetadata({
    userId,
    assetRecord,
    file: {
      name: recovery.fileName || "Recovered file",
      type: recovery.mimeType || "application/octet-stream",
      size: Number(recovery.size || 0),
    },
    folderId: recovery.folderId || null,
    categoryId: recovery.categoryId || null,
    tags: Array.isArray(recovery.tags) ? recovery.tags : [],
    linkedTargets: Array.isArray(recovery.linkedTargets) ? recovery.linkedTargets : [],
    workspaceId: recovery.workspaceId || null,
    existingItemId: recovery.existingItemId || null,
    existingVersion: Number(recovery.existingVersion || 0),
    createdAt: recovery.createdAt || isoNow(),
    recoveryId,
  });
  removeRecoveryEntry(recoveryId);
  return result;
}

export async function updateStorageItemAttributes(itemId, patch = {}) {
  const client = requireClient();
  let payload = { ...patch, updated_at: isoNow() };
  if (Object.prototype.hasOwnProperty.call(patch, "metadata")) {
    const current = await fetchStorageItemRow(client, itemId);
    payload = {
      ...payload,
      metadata: mergeMetadata(current?.metadata, patch.metadata),
    };
  }
  const { data, error } = await client.from("storage_items").update(payload).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStorageItemRecord({ itemId, assetPaths = [] }) {
  const client = requireClient();
  const currentItem = await fetchStorageItemRow(client, itemId);
  const currentMetadata = currentItem?.metadata && typeof currentItem.metadata === "object" ? currentItem.metadata : {};
  await updateStorageItemRow(client, itemId, {
    metadata: mergeMetadata(currentMetadata, {
      status: "deleting",
      last_error: null,
      delete_requested_at: isoNow(),
    }),
    deleted_at: currentItem?.deleted_at || isoNow(),
    updated_at: isoNow(),
  });
  const dedupedPaths = [...new Set((Array.isArray(assetPaths) ? assetPaths : []).filter(Boolean))];
  if (dedupedPaths.length) {
    const { error: storageError } = await client.storage.from(ENV.assetBucket).remove(dedupedPaths);
    if (storageError) {
      await updateStorageItemRow(client, itemId, {
        metadata: mergeMetadata(currentMetadata, {
          status: "cleanup_failed",
          last_error: storageError.message || "Storage object cleanup failed.",
        }),
        updated_at: isoNow(),
      });
      const error = new Error(storageError.message || "Storage object cleanup failed.");
      error.stage = "cleanup";
      error.cause = storageError;
      throw error;
    }
  }
  const { error } = await client.from("storage_items").delete().eq("id", itemId);
  if (error) {
    await updateStorageItemRow(client, itemId, {
      metadata: mergeMetadata(currentMetadata, {
        status: "cleanup_failed",
        last_error: error.message || "Metadata cleanup failed after storage delete.",
      }),
      updated_at: isoNow(),
    });
    throw error;
  }
  return true;
}

export async function recoverStorageOrphans(userId) {
  const queue = readRecoveryQueue().filter((entry) => entry?.userId === userId);
  const results = [];
  for (const recovery of queue) {
    try {
      const result = await retryStorageMetadataSync({ userId, recovery });
      results.push({ ok: true, recoveryId: recovery.recoveryId, result });
    } catch (error) {
      results.push({ ok: false, recoveryId: recovery.recoveryId, error });
    }
  }
  return results;
}
