// The folder the side panel saves PDFs into, chosen with the File System Access API.
// Chrome's downloads API can only write inside the browser's Downloads folder, so the panel
// keeps a directory handle instead. Handles can't go in chrome.storage, but IndexedDB
// stores them as-is, so the choice survives closing the panel and restarting Chrome.

const DB_NAME = 'resumeiq'
const STORE = 'handles'
const KEY = 'downloadFolder'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// The saved FileSystemDirectoryHandle, or null.
export async function getDownloadFolder() {
  try {
    return (await withStore('readonly', (s) => s.get(KEY))) ?? null
  } catch {
    return null
  }
}

// Asks the user for a folder and remembers it. Must run in a click handler.
// -> the handle, or null when the picker was cancelled.
export async function chooseDownloadFolder() {
  let handle
  try {
    handle = await window.showDirectoryPicker({ id: 'resumeiq-downloads', mode: 'readwrite' })
  } catch (err) {
    if (err.name === 'AbortError') return null
    throw err
  }
  await withStore('readwrite', (s) => s.put(handle, KEY))
  return handle
}

// Write access to `handle`. Chrome may ask the user again after a restart, which needs a
// recent click, so call this from a click handler.
export async function ensureWriteAccess(handle) {
  const opts = { mode: 'readwrite' }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

// "Acme, Inc." stays readable; characters Windows/macOS don't allow in names are dropped.
// -> '' when nothing usable is left.
export function folderNameFor(companyTarget) {
  return (companyTarget ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '') // Windows drops trailing dots and spaces
}

// True when <root>/<subfolder>/<fileName> already exists (as a file or a folder).
export async function fileExists(root, subfolder, fileName) {
  try {
    const dir = await root.getDirectoryHandle(subfolder)
    await dir.getFileHandle(fileName)
    return true
  } catch (err) {
    if (err.name === 'NotFoundError') return false
    if (err.name === 'TypeMismatchError') return true // something else already has that name
    throw err
  }
}

// Writes `blob` to <root>/<subfolder>/<fileName>, creating the subfolder if needed.
// Overwrites an existing file, so check fileExists() first.
// -> the saved file's FileSystemFileHandle.
export async function saveToFolder(root, subfolder, fileName, blob) {
  const dir = await root.getDirectoryHandle(subfolder, { create: true })
  const file = await dir.getFileHandle(fileName, { create: true })
  const writable = await file.createWritable()
  try {
    await writable.write(blob)
    await writable.close()
  } catch (err) {
    await writable.abort().catch(() => {})
    throw err
  }
  return file
}
