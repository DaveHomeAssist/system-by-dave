// Field Kit indexing gate (docs/launch/checkout.md).
// field-kit/index.html is committed noindex. The page goes into search only
// when checkout can actually open: js/sbd-launch-config.js has a
// buy.stripe.com Payment Link and a real price, and the page has no
// data-dave-placeholder block left. stage_domain_sites.mjs uses this to swap the
// staged page's robots tag to index,follow; scripts/gen_sitemap.py applies the
// same rule (field_kit_checkout_live) when it lists the page in the avbydave.com
// sitemap. Keep the two in step.
export const FIELD_KIT_PAGE = 'field-kit/index.html';
export const STRIPE_LINK = /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/;
const NOINDEX_TAG = /<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']\s*\/?>/i;

export function fieldKitCheckoutUrl(configText) {
  const block = String(configText).match(/checkout\s*:\s*\{[^}]*\}/);
  const url = block && block[0].match(/url\s*:\s*(['"])(.*?)\1/);
  return url ? url[2].trim() : '';
}

export function fieldKitCheckoutLive(configText, pageHtml) {
  const price = String(configText).match(/priceLabel\s*:\s*(['"])(.*?)\1/);
  const priceSet = Boolean(price) && price[2].trim() !== '' && price[2] !== 'Price TBD' && !/^\s*\[/.test(price[2]);
  return STRIPE_LINK.test(fieldKitCheckoutUrl(configText)) && priceSet && !/data-dave-placeholder/.test(String(pageHtml));
}

// The staged copy of the page: unchanged until checkout is live, then indexable.
export function stagedFieldKitPage(configText, pageHtml) {
  if (!fieldKitCheckoutLive(configText, pageHtml)) return pageHtml;
  if (!NOINDEX_TAG.test(pageHtml)) throw new Error(`${FIELD_KIT_PAGE} lost its noindex,nofollow tag; the indexing gate cannot swap it.`);
  return pageHtml.replace(NOINDEX_TAG, '<meta name="robots" content="index,follow" />');
}
