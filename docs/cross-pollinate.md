# Cross-Pollinate playtest

The direct-link preview at https://systembydave.com/puzzle/ serves a standalone,
generated artifact. Keep `puzzle/index.html` out of the sitemap while it is a
playtest preview. The page includes up-front site navigation, a skip link,
social metadata, and a CSP pinning the inline game script.

The build owner is the Cross-Pollinate repository. The export was built
from revision `5eaa0ee02b4f70874771a3dedd4c97ba5fd3851f` with
`npm run build -- --system-by-dave`. Copy its
`dist/system-by-dave/index.html` into `puzzle/index.html` for updates. Changes
to the game or its hosted markup belong in the source repository.

The November 27 phone repair keeps all 27 in-game keyboard controls inside
320, 375 and 412 CSS-pixel portrait viewports. The 412-pixel case represents
the Galaxy Note 20 class viewport reported in the physical playtest. It also
contains the date card and Garden bed progress label without changing saved
attempt keys or requiring the phone keyboard or stylus.
