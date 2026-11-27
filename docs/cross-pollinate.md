# Cross-Pollinate playtest

The direct-link preview at https://systembydave.com/puzzle/ serves a standalone,
generated artifact. Keep `puzzle/index.html` out of the sitemap while it is a
playtest preview. The page includes up-front site navigation, a skip link,
social metadata, and a CSP pinning the inline game script.

The build owner is the Cross-Pollinate repository. The export was built
from revision `0ba24fc17d348589f67449b24ea1f4f86dd808fc` with
`npm run build -- --system-by-dave`. Copy its
`dist/system-by-dave/index.html` into `puzzle/index.html` for updates. Changes
to the game or its hosted markup belong in the source repository.
