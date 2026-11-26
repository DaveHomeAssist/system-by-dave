# Envision

Envision opens on an image brief at `/envision/`. Choose a subject and a square, wide or tall composition, or describe a change to an existing image. The flyer tasks still provide art direction, billing zones and a separate field for approved show copy. The field guide credits the No Nonsense examples.

Saved briefs belong to this origin and browser. Portable layout files use the existing nnc-layout-1 format. Open a saved file from the original kit to continue on this site. Keep the direct route and its editor out of the sitemap. Acceptance covers prompt generation, saving and reopening a brief, importing a portable layout, and exporting a revision at the source canvas size.

Both downloads use the event name shown in the editor. Older layout files start with their imported filename. Correct the name before saving if a previous export carries another event’s name. Saved projects retain the name even when the file is renamed.

Give the brief a name, build the prompt and choose **Export brief**. The same action is available under **Saved briefs**. Import the download into Envision Personal Studio to create an image or show project and use its prompt on your own GPU. Show briefs carry approved copy separately. Previously exported briefs without a project kind still open as shows. Installation and recovery are covered in the [personal studio guide](../apps/envision-studio/README.md).

To launch the private workspace from the public kit, open **Saved briefs**, enter its HTTPS origin under **Personal studio address**, and save. **Open personal studio** appears on this browser. Clearing the address removes the shortcut. Opening the studio requires the owner's private network.

Verify a new image brief and a revision at phone and desktop widths. Build the prompt, export it from the result and import it into the private studio. Reopen an existing saved flyer in the public kit and check its format, wording and separate event copy through the same handoff.

## Project artwork

The first artwork pass covers three places where someone encounters a project for the first time.

- In the browser layout editor, a visitor without a file can open an editable optical study, change its title and download the PNG or portable layout. The sample uses original software artwork. The existing file picker and unsaved-edit guard apply to imported layouts.
- In the private studio, project cards show the chosen layout background first. A project without one can show its latest generated or finished image. The card uses the project's private thumbnail route. Choosing a card opens the existing project and leaves its saved layout and revisions intact.
- When someone shares the System by Dave Prompt Lab page, its preview uses artwork prepared for that project. The page itself continues to show the actual extension interface.

Verify the sample through edit, save and reopen. Check a private card with a fixed background, a generated candidate and a reference-only library. Check the shared Prompt Lab image's dimensions and both metadata URLs on the published page.

## Using an image prompt from the Prompt Library

People choosing a prompt in the public library need a way to bring its exact wording into a new image project. Open an entry’s **Image prompt**, then choose **Export for Envision**. Import the named brief in the personal studio. The file carries the entry title and the displayed image prompt. Export happens on the device and uses the existing image brief format.

The first artwork example comes from the library’s Urban Architecture entry. The tools directory also uses dedicated artwork for Trailkeeper. Test the handoff with an image entry and a text-only entry, check the copy recovery path with clipboard access denied, and reopen the downloaded brief in the studio. Verify that expanding and collapsing a card never leaves duplicate controls and that the phone layout keeps the chosen prompt and its actions within reach.

Run the browser regression against a local or published site with Playwright installed. Set `ENVISION_PUBLIC_BASE` to the site origin and run `node apps/envision-studio/probe-library.cjs`. Set `ENVISION_BRIEF_EVIDENCE` to an existing directory to save the downloaded example and screenshots.
