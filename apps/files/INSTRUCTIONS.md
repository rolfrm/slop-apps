# Files App — Integration Guide

The Files app provides local-storage-backed file management for SlopOS. Other apps can use inter-app messaging to read and write files.

## App ID

You need the installed app ID (shown in SlopOS settings) to send messages. The Notes app uses `FILES_APP_ID = 'mbq7qhd4mqro'` — update this to match your installed instance.

## Storage

Files are stored in the Files app's sandboxed `appStorage`:

| Key | Value |
|-----|-------|
| `files_index_v1` | JSON array of file metadata records |
| `file_content_v1_<id>` | Raw file content string |

### File record shape
```json
{
  "id": "abc123",
  "folder": "root",
  "name": "example.txt",
  "mimeType": "text/plain",
  "size": 42,
  "createdAt": 1700000000000,
  "updatedAt": 1700000001000
}
```

## Messaging Protocol

Send messages via `appMessaging.send(filesAppId, payload)`. All responses have shape `{ ok: boolean, error?: string, ... }`.

---

### `saveFile`

Create or update a file. Matches on `id` first, then `folder`+`name`.

**Request:**
```json
{
  "action": "saveFile",
  "file": {
    "id": "optional-existing-id",
    "folder": "root",
    "name": "note.txt",
    "mimeType": "text/plain",
    "content": "Hello, world!"
  }
}
```

**Response:**
```json
{ "ok": true, "file": { "id": "...", "folder": "root", "name": "note.txt", ... } }
```

---

### `getFile`

Retrieve a file with its content.

**Request (by path):**
```json
{ "action": "getFile", "folder": "root", "name": "note.txt" }
```

**Request (by id):**
```json
{ "action": "getFile", "id": "abc123" }
```

**Response:**
```json
{ "ok": true, "file": { "id": "...", "content": "Hello, world!", ... } }
```
Returns `{ "ok": true, "file": null }` if not found.

---

### `deleteFile`

Delete a file by id or path.

**Request:**
```json
{ "action": "deleteFile", "id": "abc123" }
```
or
```json
{ "action": "deleteFile", "folder": "root", "name": "note.txt" }
```

**Response:**
```json
{ "ok": true, "id": "abc123" }
```

---

### `listFiles`

List file metadata (no content).

**Request (all files):**
```json
{ "action": "listFiles" }
```

**Request (by folder):**
```json
{ "action": "listFiles", "folder": "root" }
```

**Response:**
```json
{ "ok": true, "files": [ { "id": "...", "folder": "root", "name": "...", ... } ] }
```
