const { google } = require('googleapis');
const https = require('https');
const path = require('path');

// ─── OAuth2 Client (user's personal Google account) ───────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:8080/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Use a separate drive client only for permissions (not file upload)
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ─── Resumable Upload Helpers ──────────────────────────────────────────────────

/**
 * Step 1 of resumable upload: Initialize the upload session.
 * Returns the upload URL to use for the actual file transfer.
 */
const initResumableUpload = (accessToken, filename, mimeType, fileSize, folderId) => {
  return new Promise((resolve, reject) => {
    const metadata = JSON.stringify({ name: filename, parents: [folderId] });
    const metaBytes = Buffer.from(metadata, 'utf-8');

    const options = {
      hostname: 'www.googleapis.com',
      path: `/upload/drive/v3/files?uploadType=resumable&fields=id,name,parents`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': metaBytes.length,
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize,
      },
    };

    const req = https.request(options, (res) => {
      // Drain any body (init response has no body we need)
      res.resume();
      if (res.statusCode === 200) {
        const location = res.headers.location;
        if (location) {
          console.log(`[Drive] 🔗 Resumable session created`);
          resolve(location);
        } else {
          reject(new Error('Drive resumable init: no Location header in response'));
        }
      } else {
        reject(new Error(`Drive resumable init failed with status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(metaBytes);
    req.end();
  });
};

/**
 * Step 2 of resumable upload: PUT the entire file buffer to the upload URL.
 * Returns the full file object from Drive (id, name, parents).
 */
const putFileBuffer = (uploadUrl, buffer, mimeType) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(uploadUrl);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Could not parse Drive upload response: ${data}`));
          }
        } else {
          reject(new Error(`Drive file PUT failed (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to Google Drive using the resumable upload protocol.
 * Retries up to 3 times on network errors (ECONNRESET, ETIMEDOUT, etc.)
 *
 * @param {Buffer} buffer    - File buffer (from multer memoryStorage)
 * @param {string} filename  - Desired filename on Drive
 * @param {string} mimeType  - MIME type of the file
 * @returns {Promise<{ fileId: string, publicUrl: string }>}
 */
const uploadToDrive = async (buffer, filename, mimeType) => {
  const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env');

  console.log(`[Drive] 📂 Folder: ${FOLDER_ID}`);
  console.log(`[Drive] 📤 Uploading: "${filename}" (${mimeType}) — ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Get a fresh access token
      const { token: accessToken } = await oauth2Client.getAccessToken();

      // Step 1: Initialize resumable upload session (fresh session each attempt)
      const uploadUrl = await initResumableUpload(accessToken, filename, mimeType, buffer.length, FOLDER_ID);

      // Step 2: PUT the file buffer
      const fileData = await putFileBuffer(uploadUrl, buffer, mimeType);
      const fileId = fileData.id;
      console.log(`[Drive] ✅ Upload complete: fileId=${fileId}, parents=${JSON.stringify(fileData.parents)}`);

      // Step 3: Make the file publicly readable
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      console.log(`[Drive] 🔓 Public permission set for ${fileId}`);

      const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      return { fileId, publicUrl };

    } catch (err) {
      lastError = err;
      const isRetryable = (
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        err.message?.includes('ECONNRESET') ||
        err.message?.includes('socket hang up')
      );

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = attempt * 1000; // 1s, 2s ...
        console.warn(`[Drive] ⚠️ Upload attempt ${attempt} failed (${err.code || err.message}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break; // non-retryable error or max attempts reached
      }
    }
  }

  throw lastError;
};

/**
 * Fetch a thumbnail image from Drive and return the stream + mimeType.
 * Used by the backend thumbnail proxy endpoint.
 * @param {string} fileId - Drive file ID
 * @returns {Promise<{ stream, mimeType }>}
 */
const getThumbnailStream = async (fileId) => {
  const meta = await drive.files.get({ fileId, fields: 'mimeType' });
  const mimeType = meta.data.mimeType || 'image/jpeg';
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return { stream: response.data, mimeType };
};

/**
 * Stream a video file from Google Drive with byte-range support.
 * @param {string} fileId   - Drive file ID
 * @param {string} [range]  - HTTP Range header (e.g. 'bytes=0-1023')
 * @returns {Promise<{ stream, start, end, fileSize, chunksize, mimeType }>}
 */
const getFileStream = async (fileId, range) => {
  const meta = await drive.files.get({ fileId, fields: 'size, mimeType' });

  const fileSize = parseInt(meta.data.size, 10);
  const mimeType = meta.data.mimeType || 'video/mp4';

  let start = 0;
  let end = fileSize - 1;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1);
  }

  const chunksize = end - start + 1;

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
  );

  return { stream: response.data, start, end, fileSize, chunksize, mimeType };
};

/**
 * Delete a file from Google Drive by its file ID.
 * @param {string} fileId - Drive file ID
 */
const deleteFromDrive = async (fileId) => {
  if (!fileId) return;
  try {
    await drive.files.delete({ fileId });
    console.log(`[Drive] 🗑️  Deleted: ${fileId}`);
  } catch (err) {
    console.warn(`[Drive] Could not delete ${fileId}:`, err.message);
  }
};

/**
 * Extract a Drive file ID from a public Drive URL.
 * Handles: https://drive.google.com/uc?export=view&id=FILE_ID
 * @param {string} url
 * @returns {string|null}
 */
const extractFileIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

module.exports = { uploadToDrive, getThumbnailStream, getFileStream, deleteFromDrive, extractFileIdFromUrl };
