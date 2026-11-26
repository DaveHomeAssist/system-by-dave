# Envision Personal Studio

Envision runs image generation on a Windows GPU and keeps projects, revisions, proofs and show exports on a private Linux coordinator. The web app opens on the owner's Mac or phone through Tailscale Serve. The public Envision prompt kit can export a saved brief for import here.

On Apple Silicon, the standalone app opens on image generation and offers native PNG export and offline image comparison. [Envision Studio for Mac](../envision-mac/README.md).

## Using the studio

Project cards show the layout background chosen by the owner, or the latest generated or finished image when the background is empty. Opening a card restores the saved selection first. References, logos and masks are excluded from automatic cover selection. Cards load small project-scoped WebP thumbnails from the private origin.

1. Open **Projects**. Choose **New project** for an image or a show. **Import project** opens a native editable package, an eleven-layer flyer or a public Envision brief. Briefs open in **Create** with the imported prompt. A show brief also carries approved copy, and older briefs open as shows. Editable projects open in **Layout**.
2. In **Create**, enter the image direction. Choose a native render size and one to four candidates. The advanced controls expose a seed, reference roles and strength. **Generate on Walter** queues the work. You can close the tab and open the same project from another device.
3. In **Library**, select a candidate and use **Compare** to check it against an original. **Full view** expands the proof on a phone. **Use as background** selects it for layout. **Revise** starts from this version. The image stays available in the library after later changes.
4. Choose **Edit a region** to paint the area the GPU can change. Clear pixels retain the source exactly. **Apply local finish** adds scanlines, a darker grade or grain on the coordinator. A painted region can limit the finish.
5. Open **Layout** to change an event field once across bound stages, replace a supplied logo, lock a layer or adjust its position per format. **Fit original** preserves a baked title in tall or wide outputs. **Fill frame** uses a crop. Feed and story safe guides appear in the proof only.
6. Save pending changes with **Save layer** or **Save event fields** in the form you edited. If you edited both forms, save both. **Render outputs**, **Editable package**, and **Legacy flyer file** export the saved revision. Choose formats for the current stage or select **Include every campaign stage** for a full show. Each PNG and package uses the event name. The editable package carries the project, artwork versions, masks and font. The legacy flyer file supports the original eleven-layer canvas.
7. Use **Queue** for elapsed time, errors, cancel, retry and pause. A pause takes effect between jobs. Finishing on the coordinator and exporting show layouts both work while the GPU is busy or unavailable.

**References.** A starting image establishes revision coordinates. A composition reference conditions the generation. A style reference applies a palette transfer. Supply exact logos as layout layer assets. Existing legacy titles may be part of the background. Local art stays in the private data volume and explicit downloads.

## Installation

Use an owner-controlled Linux machine with Docker, Tailscale Serve, local disk for SQLite and enough disk for the media and a temporary backup. On Windows, provide Python 3.10 or later, curl.exe, the NVIDIA driver, the installed SDXL Turbo checkpoint and a working loopback ComfyUI engine. Verify the checkpoint source, intended use and license on the model card. [SDXL Turbo model card](https://huggingface.co/stabilityai/sdxl-turbo)

Build and check the coordinator from this directory.

```sh
docker build -t envision-personal-studio:local .
```

```sh
docker run --rm --network none envision-personal-studio:local python -m unittest -v test_studio
```

Set `ENVISION_OWNER` to the exact owner login reported by Tailscale, `ENVISION_ORIGIN` to the private HTTPS URL including port 8443, `ENVISION_HOME` to a new private install directory, `ENVISION_VOLUME` to a local private data directory and `ENVISION_IMAGE` to the tested Docker image. The coordinator binds to loopback on port 8766. Only trusted local processes and the private Tailscale proxy should reach that listener.

```sh
sh deploy/coordinator.sh
```

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:8766
```

Verify the owner sees Projects through the HTTPS URL. A direct request to the loopback listener without gateway identity returns 403. The raw model engine is local to Windows. The worker initiates outgoing connections to the coordinator.

Transfer the new coordinator's `config/worker.key` over authenticated SSH to the Windows user's `%LOCALAPPDATA%\EnvisionPersonalStudio\worker.key`. Restrict access to that user. Place `worker.py`, `backup.py`, `deploy/pull-backup.py` and the two PowerShell installers together in that directory. Run the worker installer there with the private origin and the full path to the installed checkpoint.

```powershell
.\install-worker.ps1 -StudioOrigin $StudioOrigin -Checkpoint $Checkpoint
```

The installer records the checkpoint digest and creates the Envision Personal Studio Worker logon task. The worker checks engine availability and the queue before claiming work. Retry keeps the candidate and seed. Other users' engine jobs can run first. Cancellation discards a late studio result. The underlying shared engine may finish an in-flight render. ComfyUI keeps its studio input and output files under its own `envision` subfolders.

## Backup, restore and update

From the signed-in Windows owner account, register the independent daily backup. It downloads the catalog and all referenced media at 04:15 local time and verifies every checksum before rotating the seven dated snapshots. A missed run is eligible to start when Windows is available. The worker credential cannot download owner backups.

```powershell
.\install-backup.ps1
```

For a fresh snapshot before maintenance, download the private owner's `/api/v1/owner-backup` to a new filename. Keep credentials and machine configuration separately. To inspect or recover a snapshot, work on a new destination on a disk with room for an additional copy.

```sh
python backup.py backup.zip --restore ./recovered-studio
```

A restore checks the catalog's SQLite integrity and its complete media inventory. Restarted exports resume from recorded files. Interrupted GPU jobs receive a fresh lease. For an upgrade, build and test a new tag, set `ENVISION_IMAGE` to it and reuse the same `ENVISION_HOME`, `ENVISION_VOLUME`, owner and origin.

```sh
sh deploy/coordinator.sh --upgrade
```

The installer keeps the previous container for rollback and restores it automatically when the new service fails its startup check. For a later rollback, use the previous tested tag with the same data schema. Use a verified pre-upgrade snapshot on a separate volume when changing schemas.

## Verification and operating limits

- `python -m unittest -v test_studio` exercises private access, queue leases, idempotency, hard masks, revision conflicts, overnight dates, storage pressure, portable files, pinned exports and snapshot recovery. Use the coordinator image to get the pinned Python dependencies and the renderer font.
- Run `node probe.cjs` with Playwright and Chromium on the private network. Set `ENVISION_ORIGIN` and provide private AfterJinx and Signal Assembly Fire fixtures. Optionally set `ENVISION_EVIDENCE` to a private screenshot directory and `ENVISION_RENDER_TRIAL=1` to run the phone-to-second-browser generation test. The probe archives its own drafts.
- Run `node probe-editable-exports.cjs` against the same fixtures to check pending edits, download both editable formats, and compare their reopened wording and rendered proofs. Set `ENVISION_EVIDENCE` to a private directory to keep the two files and their proofs.
- Run `node probe-briefs.cjs` with Playwright and Chromium against the public kit. Set `ENVISION_PUBLIC_BASE` to the site's origin and optionally set `ENVISION_BRIEF_EVIDENCE` to an existing screenshot directory. The probe uses temporary browser storage for image, revision and saved flyer examples.
- The pilot has one SDXL Turbo profile, one active job per GPU worker, five native sizes and batches of up to four. Outputs use source dimensions, feed 1080 × 1350, story 1080 × 1920, lobby 1920 × 1080 or a custom canvas up to 4096 px per side. Export dimensions can exceed native generation dimensions.
- New images and revisions use the model's Turbo noise schedule. Update the Windows worker when updating the coordinator. The queue assigns each job to a worker supporting its recorded workflow. [ComfyUI SDXL Turbo example](https://comfyanonymous.github.io/ComfyUI_examples/sdturbo/)
- The studio samples device-wide GPU memory. The engine receipt includes its version, model checksum, workflow digest, seed, engine execution time, queue wait and total elapsed. A hardware reboot or model change needs its own timing and recovery check.
- The production source lives in this directory. GitHub Pages serves the browser-local prompt kit and layout editor. The private coordinator, media, owner account and worker key belong on the two operator-controlled machines.
