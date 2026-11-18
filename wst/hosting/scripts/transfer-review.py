"""Upload only new allowlisted originals, then verify every public original."""
import concurrent.futures
import getpass
import hashlib
import http.client
import json
import pathlib
import sys
import threading

root = pathlib.Path(sys.argv[1])
manifest = json.loads((root / 'media.json').read_text())
token = getpass.getpass('Temporary upload token (hidden): ')
local = threading.local()


def transfer(item):
    route, meta = item
    source = root / 'originals' / meta['key']
    body = source.read_bytes() if source.exists() else None
    if body is not None and hashlib.sha256(body).hexdigest() != meta['sha256']:
        raise ValueError('Local checksum mismatch: ' + route)
    if '/sessions/' in route and body is None:
        raise FileNotFoundError('New session original is missing: ' + str(source))
    for attempt in range(3):
        try:
            conn = http.client.HTTPSConnection('wst.housevideo.app', timeout=45)
            if '/sessions/' in route:
                conn.request('PUT', route, body, {'Authorization': 'Bearer ' + token, 'Content-Type': 'image/jpeg', 'Content-Length': str(len(body))})
                response = conn.getresponse()
                response.read()
                if response.status == 409:
                    raise RuntimeError('Conflicting stored hash, upload refused: ' + route)
                if response.status not in (201, 204):
                    raise RuntimeError('Upload HTTP ' + str(response.status))
            conn.request('GET', route)
            response = conn.getresponse()
            returned = response.read()
            conn.close()
            if response.status != 200 or hashlib.sha256(returned).hexdigest() != meta['sha256']:
                raise RuntimeError('Public checksum mismatch or HTTP ' + str(response.status))
            return route, meta['sha256'], body is not None and '/sessions/' in route
        except Exception:
            if attempt == 2:
                raise


verified, failed, uploaded = {}, [], 0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(transfer, item): item[0] for item in manifest.items()}
    for result in concurrent.futures.as_completed(futures):
        try:
            route, digest, did_upload = result.result()
            verified[route] = digest
            uploaded += int(did_upload)
        except Exception as error:
            failed.append({'path': futures[result], 'error': str(error)})
        if (len(verified) + len(failed)) % 100 == 0:
            print('Verified', len(verified), 'of', len(manifest), 'failures', len(failed), flush=True)
(root / 'public-verification.json').write_text(json.dumps({'expected': len(manifest), 'verified': verified, 'uploaded': uploaded, 'readOnly': len(verified) - uploaded, 'failed': failed}, indent=2))
print(json.dumps({'expected': len(manifest), 'verified': len(verified), 'uploaded': uploaded, 'readOnly': len(verified) - uploaded, 'failed': failed}), flush=True)
if failed:
    raise SystemExit(1)
