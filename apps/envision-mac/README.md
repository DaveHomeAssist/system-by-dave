# Envision Studio for Mac

## Desktop build brief

Dave needs to start an image, see Walter's candidates, and revise or export the result from a Mac application. Generation opens first. The connected studio retains the full project, layout, mask, finish and queue tools. The local comparison view opens two saved images, including exported flyers, with or without a connection.

The Mac creates image projects and submits jobs through Dominic's existing owner API over Tailscale. The coordinator keeps the catalog, revisions, artwork and submission keys. Walter performs the render. The app keeps connection settings and generation drafts on this Mac. A native window embeds the existing studio for advanced work. This approach preserves the editable formats, existing projects and worker protocol. The private origin is set per installation.

The first release targets Dave's Apple Silicon Mac. Build it with the macOS Command Line Tools. Acceptance uses the installed application to submit original artwork for Envision, follow the jobs through completion, export a PNG, reopen the project, open the full studio and compare two local images offline. The two original show projects are reference fixtures. The app icon and sample image come from dedicated Walter jobs for the software.

The Generate screen should let Dave repeat a studio render without finding its recipe in another view. Recall the selected artwork's prompt, a saved project brief or the prompt for the included optical sample. Verify replacement and cancellation on an existing draft. Display the engine time only when the worker recorded it.

## Using the app

Open **Generate**, select an image project or create one, then enter a prompt. Choose a canvas size and number of images. The reference and advanced controls also support revising an existing image and choosing a seed. **Generate on Walter** submits the batch. Generated candidates appear in the project gallery. Choose **Save PNG** to export the selected image.

**Recall prompt** offers the project brief, selected artwork prompt and studio sample as available. It fills the prompt editor and asks before replacing a draft. The artwork dimensions include Walter's engine time when recorded. The canvas, references and seed keep their current settings.

Open **Studio** for the complete private workspace, including region edits, the job queue and editable project imports and exports. **Compare** opens two local PNG, JPEG or WebP files. Use **Phone** to check the art at a logical width of 375 points.

Use **File > Open** with a brief exported from the public Envision prompt builder. The Mac opens **Generate** with the imported prompt in its new project. A layered flyer or editable project package opens in **Studio** on **Layout**.

**Layout** opens a layered composition for the current project. Image projects start with an empty stage. In Library, choose an image and select **Use as background**, then open Layout to add type or a supplied logo. Show projects can also bind those layers to event fields.

## Artwork included in the app

| Asset | Use | Walter render |
| --- | --- | --- |
| Aperture | App icon | 512 × 512, seed 241107 |
| Refraction | Sample on an empty generation canvas | 768 × 432, seed 921065 |

Both use the studio’s SDXL Turbo profile and four steps. The original candidate images, prompts, and revisions are available in the private **Envision Desktop Artwork** project.

## Build and connect

Run this from the repository root on an Apple Silicon Mac with the Command Line Tools.

```sh
bash apps/envision-mac/build.sh /tmp/envision-mac-build
```

Copy **Envision Studio.app** from the output directory into your Applications folder. In the app, open **Connection**, enter the private HTTPS studio address including the port, and connect over Tailscale. Local builds use ad hoc signing. The ZIP contains the same application bundle. A fresh installation needs the private address from its owner. Offline comparison reads files directly on the Mac.

[Private coordinator and worker guide](../envision-studio/README.md).
