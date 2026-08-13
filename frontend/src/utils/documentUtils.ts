import { getFileUrl } from '../config/api';

/**
 * Opens a document securely in a new browser tab/preview window using
 * Bearer token authentication in HTTP headers and Blob URLs (no JWTs in query strings).
 */
/**
 * Opens a document securely in a new browser tab/preview window using
 * Bearer token authentication in HTTP headers and Blob URLs (no JWTs in query strings).
 * 
 * Synchronously invokes window.open() at the start of the click handler to prevent
 * browser popup blockers from blocking the new tab.
 */
export const openDocumentPreview = async (fileUrl?: string, fileName?: string): Promise<void> => {
  if (!fileUrl || fileUrl === '#') {
    alert('No document URL available for preview.');
    return;
  }

  // Open a blank window synchronously inside the user click handler stack
  // to prevent browser popup blockers from triggering after asynchronous fetch.
  const previewWindow = window.open('', '_blank');

  if (previewWindow) {
    try {
      previewWindow.document.title = fileName || 'Loading Document Preview...';
      previewWindow.document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName || 'Loading Preview...'}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f8fafc;
                color: #334155;
              }
              .spinner {
                border: 3px solid #e2e8f0;
                border-top: 3px solid #2563eb;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                animation: spin 0.8s linear infinite;
                margin-bottom: 16px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
              .sub { font-size: 13px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <div class="title">Loading Document Preview...</div>
            <div class="sub">${fileName || 'Fetching file securely'}</div>
          </body>
        </html>
      `;
    } catch {
      // Ignore initial window document setup errors if cross-origin boundary
    }
  }

  const fullUrl = getFileUrl(fileUrl);

  // External URLs (http/https not pointing to our server uploads or R2 storage) open directly
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    if (!fileUrl.includes('/uploads/') && !fileUrl.includes('r2.cloudflarestorage.com')) {
      if (previewWindow) {
        previewWindow.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
  }

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, { headers });
    } catch (fetchErr) {
      // If fetching with Authorization header failed (e.g. CORS preflight blocked on cross-origin redirect),
      // retry fetching without Authorization header!
      console.warn('[Document Preview] Retry fetch without Authorization header due to CORS/network error:', fetchErr);
      response = await fetch(fullUrl);
    }

    if (!response.ok) {
      let errText = `Status ${response.status}`;
      try {
        const errJson = await response.json();
        errText = errJson.error || errJson.message || errText;
      } catch {
        // ignore parse error
      }

      if (previewWindow && !previewWindow.closed) {
        previewWindow.document.body.innerHTML = `
          <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px;">
            <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Document</h3>
            <p style="color: #64748b; font-size: 14px;">${errText}</p>
          </div>
        `;
      } else {
        alert(`Failed to load document preview: ${errText}`);
      }
      return;
    }

    const rawBlob = await response.blob();
    const responseContentType = response.headers.get('Content-Type') || rawBlob.type || 'application/octet-stream';
    const typedBlob = new Blob([rawBlob], { type: responseContentType });
    const objectUrl = window.URL.createObjectURL(typedBlob);

    console.log('[Document Preview Browser Verification]', {
      requestedUrl: fileUrl,
      fullUrl,
      httpStatusCode: response.status,
      httpContentType: response.headers.get('Content-Type'),
      httpContentLength: response.headers.get('Content-Length'),
      blobType: typedBlob.type,
      blobSize: typedBlob.size,
      objectUrl
    });

    if (previewWindow && !previewWindow.closed) {
      if (typedBlob.type.startsWith('image/')) {
        previewWindow.document.title = fileName || 'Image Preview';
        previewWindow.document.body.style.margin = '0';
        previewWindow.document.body.style.backgroundColor = '#0f172a';
        previewWindow.document.body.style.display = 'flex';
        previewWindow.document.body.style.alignItems = 'center';
        previewWindow.document.body.style.justifyContent = 'center';
        previewWindow.document.body.style.minHeight = '100vh';
        previewWindow.document.body.innerHTML = `<img src="${objectUrl}" style="max-width:98%;max-height:98vh;object-fit:contain;box-shadow:0 10px 25px rgba(0,0,0,0.5);border-radius:8px;" alt="${fileName || 'Preview'}" />`;
      } else {
        previewWindow.document.title = fileName || 'Document Preview';
        try {
          previewWindow.location.replace(objectUrl);
        } catch {
          previewWindow.document.body.style.margin = '0';
          previewWindow.document.body.style.overflow = 'hidden';
          previewWindow.document.body.innerHTML = `<iframe src="${objectUrl}" style="width:100%;height:100vh;border:none;margin:0;padding:0;" title="${fileName || 'Preview'}"></iframe>`;
        }
      }
    } else {
      window.location.href = objectUrl;
    }

    // Revoke object URL after tab loading window timeout
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 120000);
  } catch (error: any) {
    console.error('[Document Preview Error]', error);
    const errMsg = error.message || 'Network error';

    if (previewWindow && !previewWindow.closed) {
      previewWindow.document.body.innerHTML = `
        <div style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px;">
          <h3 style="color: #ef4444; margin-bottom: 8px;">Unable to Preview Document</h3>
          <p style="color: #64748b; font-size: 14px;">${errMsg}</p>
        </div>
      `;
    } else {
      alert(`Unable to preview document: ${errMsg}`);
    }
  }
};

/**
 * Downloads a document securely with Bearer token headers via Blob creation.
 */
export const downloadDocument = async (fileUrl?: string, fileName?: string): Promise<void> => {
  if (!fileUrl || fileUrl === '#') {
    alert('No document available for download.');
    return;
  }

  const fullUrl = getFileUrl(fileUrl);

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, { headers });
    } catch {
      response = await fetch(fullUrl);
    }

    if (!response.ok) {
      let errText = `Status ${response.status}`;
      try {
        const errJson = await response.json();
        errText = errJson.error || errJson.message || errText;
      } catch {
        // ignore parse error
      }
      alert(`Failed to download document: ${errText}`);
      return;
    }

    const rawBlob = await response.blob();
    const responseContentType = response.headers.get('Content-Type') || rawBlob.type || 'application/octet-stream';
    const typedBlob = new Blob([rawBlob], { type: responseContentType });
    const objectUrl = window.URL.createObjectURL(typedBlob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'Document';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    }, 1000);
  } catch (error: any) {
    console.error('[Document Download Error]', error);
    alert(`Download failed: ${error.message || 'Network error'}`);
  }
};
