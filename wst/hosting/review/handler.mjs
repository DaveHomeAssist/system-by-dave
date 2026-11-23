// Read-only release snapshots plus checksum-allowlisted original photo ingestion.
export function reviewHandler(release) {
  const response = (text, status) => new Response(text, { status, headers: { 'cache-control': 'no-store' } });
  const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  return async function handleReview(request, env) {
    const path = new URL(request.url).pathname;
    const record = release.active && (path === '/run-review/catalog.json' ? release.catalog : release.manifests[path]);
    if (record) {
      if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed', 405);
      return new Response(request.method === 'HEAD' ? null : JSON.stringify(record), { headers: { 'content-type': 'application/json', 'cache-control': path.endsWith('/catalog.json') ? 'no-store' : 'public,max-age=31536000,immutable', 'x-content-type-options': 'nosniff' } });
    }
    if (!Object.hasOwn(release.media, path)) return null;
    const item = release.media[path];
    if (!env.REVIEW_PHOTOS) return response('Photo storage is not ready', 503);
    if (request.method === 'PUT') {
      if (!env.REVIEW_UPLOAD_TOKEN || await digest(new TextEncoder().encode(request.headers.get('authorization') || '')) !== await digest(new TextEncoder().encode('Bearer ' + env.REVIEW_UPLOAD_TOKEN))) return response('Unauthorized', 401);
      if (request.headers.get('content-type') !== 'image/jpeg') return response('JPEG required', 415);
      if (Number(request.headers.get('content-length')) !== item.bytes) return response('Photo size mismatch', 400);
      const reader = request.body?.getReader(); if (!reader) return response('Photo required', 400);
      const chunks = []; let length = 0;
      for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > item.bytes) { await reader.cancel(); return response('Photo too large', 413); } chunks.push(part.value); }
      if (length !== item.bytes) return response('Photo size mismatch', 400);
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (await digest(bytes) !== item.sha256) return response('Photo checksum mismatch', 422);
      const existing = await env.REVIEW_PHOTOS.head(item.key);
      if (existing) return existing.customMetadata?.sha256 === item.sha256 ? response(null, 204) : response('Stored photo conflict', 409);
      await env.REVIEW_PHOTOS.put(item.key, bytes, { httpMetadata: { contentType: 'image/jpeg' }, customMetadata: { sha256: item.sha256 } });
      return response(null, 201);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed', 405);
    const image = await env.REVIEW_PHOTOS[request.method === 'HEAD' ? 'head' : 'get'](item.key);
    if (!image) return response('Original photo unavailable. Please retry.', 503);
    const headers = { 'content-type': 'image/jpeg', 'content-length': String(item.bytes), 'cache-control': 'public,max-age=31536000,immutable', 'x-photo-sha256': item.sha256, 'x-content-type-options': 'nosniff', etag: '"' + item.sha256 + '"' };
    if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : image.body, { headers });
  };
}
