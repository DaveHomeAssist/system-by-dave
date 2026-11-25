"""Walter runner. Uses Python's standard library and an existing loopback ComfyUI."""

import argparse
import hashlib
import json
import logging
import os
import socket
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

PROFILE = "sdxl-turbo-local"


def request(url, headers=None, data=None, timeout=25, raw=False):
    headers = dict(headers or {})
    if isinstance(data, dict):
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    if os.name == "nt" and urlsplit(url).scheme == "https":
        # Use Windows' native certificate chain. Pass credentials through stdin.
        config = "".join("header = " + json.dumps(k + ": " + v) + "\n" for k, v in headers.items())
        args = [
            "curl.exe",
            "--disable",
            "--config",
            "-",
            "--silent",
            "--show-error",
            "--max-time",
            str(timeout),
            "--max-filesize",
            str(45 * 1024 * 1024),
            "--write-out",
            "\n%{http_code}",
        ]
        with tempfile.TemporaryDirectory() as temp:
            if data is not None:
                input_path = Path(temp) / "request"
                input_path.write_bytes(data)
                args.extend(["--data-binary", "@" + str(input_path)])
            proc = subprocess.run(
                [*args, url],
                input=config.encode(),
                capture_output=True,
                timeout=timeout + 4,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        if proc.returncode:
            raise OSError("Private HTTPS transport failed (" + str(proc.returncode) + ").")
        body, code = proc.stdout.rsplit(b"\n", 1)
        if int(code) >= 400:
            raise HTTPError(url, int(code), "Studio request failed", None, None)
    else:
        with urlopen(Request(url, data=data, headers=headers), timeout=timeout) as r:
            body = r.read(45 * 1024 * 1024 + 1)
    if len(body) > 45 * 1024 * 1024:
        raise ValueError("Response too large.")
    return body if raw else json.loads(body)


def form(fields, files):
    bound = uuid.uuid4().hex
    parts = []
    for key, value in fields.items():
        parts.append(
            f'--{bound}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
        )
    for key, (filename, data) in files.items():
        parts.extend(
            [
                f'--{bound}\r\nContent-Disposition: form-data; name="{key}"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode(),
                data,
                b"\r\n",
            ]
        )
    parts.append(f"--{bound}--\r\n".encode())
    return {"Content-Type": "multipart/form-data; boundary=" + bound}, b"".join(parts)


def node(kind, **inputs):
    return {"class_type": kind, "inputs": inputs}


def workflow(p, model, files, jid):
    w, h = p["size"]
    graph = {
        "1": node("CheckpointLoaderSimple", ckpt_name=model),
        "2": node("CLIPTextEncode", text=p["prompt"], clip=["1", 1]),
        "3": node("CLIPTextEncode", text="", clip=["1", 1]),
        "4": node("EmptyLatentImage", width=w, height=h, batch_size=1),
    }
    latent = ["4", 0]
    strength = 1.0
    if files.get("starting") or files.get("composition"):
        graph["8"] = node("LoadImage", image=files.get("starting") or files["composition"])
        image = ["8", 0]
        if files.get("starting") and files.get("composition"):
            graph["11"] = node("LoadImage", image=files["composition"])
            graph["12"] = node(
                "ImageBlend", image1=image, image2=["11", 0], blend_factor=0.25, blend_mode="normal"
            )
            image = ["12", 0]
        graph["9"] = node("VAEEncode", pixels=image, vae=["1", 2])
        latent = ["9", 0]
        strength = p["strength"]
    if "mask" in files:
        graph["13"] = node("LoadImage", image=files["mask"])
        graph["14"] = node("ImageToMask", image=["13", 0], channel="red")
        graph["15"] = node("SetLatentNoiseMask", samples=latent, mask=["14", 0])
        latent = ["15", 0]
    graph.update(
        {
            "5": node(
                "KSampler",
                model=["1", 0],
                positive=["2", 0],
                negative=["3", 0],
                latent_image=latent,
                seed=p["seed"],
                steps=p["steps"],
                cfg=1.0,
                sampler_name="euler_ancestral",
                scheduler="normal",
                denoise=strength,
            ),
            "6": node("VAEDecode", samples=["5", 0], vae=["1", 2]),
            "7": node("SaveImage", images=["6", 0], filename_prefix="envision/" + jid),
        }
    )
    return graph


def gpu_used():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            timeout=4,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        return int(out.splitlines()[0])
    except (OSError, ValueError, subprocess.SubprocessError, IndexError):
        return None


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class Runner:
    def __init__(self, config):
        self.config = config
        self.home = config["origin"].rstrip("/") + "/api/v1/worker"
        if urlsplit(self.home).scheme != "https":
            raise ValueError("Private studio HTTPS is required.")
        self.engine = config.get("engine", "http://127.0.0.1:8188").rstrip("/")
        if urlsplit(self.engine).hostname not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("Use a loopback engine.")
        self.auth = {"Authorization": "Bearer " + Path(config["keyFile"]).read_text().strip()}
        self.model = Path(config["checkpoint"])
        self.sha = digest_file(self.model)
        if config.get("modelSha256") and config["modelSha256"].lower() != self.sha:
            raise ValueError("Installed checkpoint differs from the configured model checksum.")
        self.state = Path(config["state"])
        self.state.mkdir(parents=True, exist_ok=True)
        self.worker = config.get("worker", socket.gethostname())
        self.stats = {}
        self.last_status = ""

    def http(self, route, job=None, data=None, headers=None, raw=False):
        auth = self.auth | (headers or {})
        if job:
            auth["X-Lease"] = job["lease"]
        return request(self.home + route, auth, data, raw=raw)

    def engine_status(self):
        self.stats = request(self.engine + "/system_stats")
        queue = request(self.engine + "/queue")
        models = request(self.engine + "/models/checkpoints")
        return {
            "id": self.worker,
            "profiles": [PROFILE] if self.model.name in models else [],
            "busy": bool(queue["queue_running"] or queue["queue_pending"]),
            "paused": (self.state / "pause").exists(),
            "engine": "ComfyUI " + self.stats["system"]["comfyui_version"],
            "gpu": self.stats["devices"][0]["name"],
            "vramMiB": self.stats["devices"][0]["vram_total"] // 2**20,
        }

    def execute(self, job):
        jid = job["id"]
        p = job["payload"]
        base = "/jobs/" + jid
        journal = self.state / (jid + ".json")
        rec = json.loads(journal.read_text()) if journal.exists() else {}
        engine_id = rec.get("engineId")
        if engine_id and rec.get("attempt") != job["attempt"]:
            old = request(self.engine + "/history/" + engine_id).get(engine_id)
            queue = request(self.engine + "/queue")
            running = any(
                entry[1] == engine_id for entry in queue["queue_running"] + queue["queue_pending"]
            )
            if (not old and not running) or (
                old and old.get("status", {}).get("status_str") == "error"
            ):
                engine_id = None
        if not engine_id:
            files = {}
            for role, h in p["refs"].items():
                if role == "style":
                    continue  # applied by the CPU compositor at full source resolution
                raw = self.http(
                    base + "/input?" + urlencode({"hash": h, "role": role}), job, raw=True
                )
                hdr, body = form(
                    {"overwrite": "true", "subfolder": "envision", "type": "input"},
                    {"image": (jid + "-" + role + ".png", raw)},
                )
                uploaded = request(self.engine + "/upload/image", hdr, body)
                files[role] = (uploaded.get("subfolder", "") + "/" + uploaded["name"]).lstrip("/")
            graph = workflow(p, self.model.name, files, jid)
            self.http(base + "/progress", job, {"progress": "Submitting local workflow"})
            engine_id = request(
                self.engine + "/prompt", data={"prompt": graph, "client_id": "envision-" + jid}
            )["prompt_id"]
            rec = {
                "engineId": engine_id,
                "attempt": job["attempt"],
                "started": time.time(),
                "workflowHash": hashlib.sha256(
                    json.dumps(graph, sort_keys=True).encode()
                ).hexdigest(),
            }
            scratch = journal.with_suffix(".tmp")
            scratch.write_text(json.dumps(rec))
            os.replace(scratch, journal)
        last = 0
        peak = None
        while time.time() - rec["started"] < 1200:
            hist = request(self.engine + "/history/" + engine_id).get(engine_id)
            if hist:
                if hist.get("status", {}).get("status_str") == "error":
                    # Keep engine tracebacks, paths and prompt content on Walter.
                    errors = [
                        m[1]
                        for m in hist.get("status", {}).get("messages", [])
                        if m[0] == "execution_error"
                    ]
                    kind = (
                        errors[0].get("exception_type", "Engine error")
                        if errors
                        else "Engine error"
                    )
                    raise ValueError(
                        "Local workflow failed ("
                        + str(kind)[:120]
                        + "). Try a smaller size or inspect Walter."
                    )
                images = hist.get("outputs", {}).get("7", {}).get("images", [])
                if images:
                    break
            if time.monotonic() - last >= 7:
                self.http(base + "/progress", job, {"progress": "Rendering on " + self.worker})
                current = gpu_used()
                if current is not None:
                    peak = max(current, peak or 0)
                last = time.monotonic()
            time.sleep(1)
        else:
            raise ValueError("Local render exceeded its 20-minute limit.")
        raw = request(
            self.engine
            + "/view?"
            + urlencode({k: images[0][k] for k in ("filename", "subfolder", "type")}),
            raw=True,
        )
        messages = hist.get("status", {}).get("messages", [])
        stamps = {k: v.get("timestamp") for k, v in messages if isinstance(v, dict)}
        start = stamps.get("execution_start")
        end = stamps.get("execution_success")
        receipt = {
            "engineId": engine_id,
            "workflowHash": rec["workflowHash"],
            "model": self.model.name,
            "modelSha256": self.sha,
            "engineVersion": self.stats["system"]["comfyui_version"],
            "torchVersion": self.stats["system"].get("pytorch_version"),
            "gpu": self.stats["devices"][0]["name"],
            "engineSeconds": round((end - start) / 1000, 3) if start and end else None,
            "elapsedOnWorker": round(time.time() - rec["started"], 3),
            "sampledPeakDeviceMiB": peak,
        }
        hdr, body = form({"receipt": json.dumps(receipt)}, {"image": ("result.png", raw)})
        self.http(base + "/complete", job, body, hdr)
        journal.unlink(missing_ok=True)

    def run(self, once=False):
        while True:
            job = None
            try:
                try:
                    status = self.engine_status()
                except (OSError, ValueError):
                    status = {
                        "id": self.worker,
                        "profiles": [],
                        "busy": False,
                        "paused": False,
                        "engine": "Local engine offline",
                    }
                job = self.http("/claim", data=status)["job"]
                if job:
                    self.execute(job)
            except HTTPError as exc:
                # A cancelled or superseded lease never publishes a result.
                if exc.code != 409:
                    logging.warning("Service HTTP %s", exc.code)
                if job and exc.code not in (409, 502, 503, 504):
                    self.fail(job, "Service rejected this workflow (HTTP " + str(exc.code) + ").")
            except (OSError, ValueError, KeyError) as exc:
                if job and isinstance(exc, (ValueError, KeyError)):
                    self.fail(job, str(exc)[:300])
                logging.warning("Worker retry after %s", type(exc).__name__)
            if once:
                return
            time.sleep(2 if job else 4)

    def fail(self, job, message):
        try:
            self.http("/jobs/" + job["id"] + "/fail", job, {"error": message})
        except (OSError, ValueError):
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    Runner(json.loads(Path(args.config).read_text(encoding="utf-8-sig"))).run(args.once)
