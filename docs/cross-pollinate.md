# Cross-Pollinate playtest

The direct-link preview at https://systembydave.com/puzzle/ serves a standalone,
generated artifact. Keep `puzzle/index.html` out of the sitemap while it is a
playtest preview. The page includes up-front site navigation, a skip link,
social metadata, and a CSP pinning the inline game script.

The build owner is the Cross-Pollinate repository. The export was built
from revision `803948d5a5e0776cb9e671830fc08ec10754e6b4` with
`npm run build -- --system-by-dave`. Copy its
`dist/system-by-dave/index.html` into `puzzle/index.html` for updates. Changes
to the game or its hosted markup belong in the source repository.

The November 27 phone repair keeps all 27 in-game keyboard controls inside
320, 375 and 412 CSS-pixel portrait viewports. The 412-pixel case represents
the Galaxy Note 20 class viewport reported in the physical playtest. It also
contains the date card and Garden bed progress label without changing saved
attempt keys or requiring the phone keyboard or stylus.

The November 28 large-text repair keeps the title, date card, top bar and all 27
keyboard controls inside the same three viewports when every font is scaled
1.3x and 1.5x, which mimics an enlarged Android system text size. The source
probe fails on the previous build and passes on this one. Normal-size text
keeps the one-row header, and saved attempt keys are unchanged.
