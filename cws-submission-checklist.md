# Chrome Web Store Submission Checklist

## Prerequisites

- [ ] Google account with 2-Step Verification enabled
- [ ] $5 registration fee paid at https://chrome.google.com/webstore/devconsole
- [ ] Verified contact email in developer account settings
- [ ] Publisher name set (recommend: "Grateful Data" or personal name)

---

## Build the ZIP Package

```bash
cd prompt-lab-extension
npm install
npm run build
```

Post-build steps (automate or do manually):
```bash
# Copy extension files into dist
cp -r extension/* dist/

# Rename entry point
mv dist/index.html dist/panel.html

# Create submission ZIP from dist contents (NOT the dist folder itself)
cd dist
zip -r ../prompt-lab-v1.0.0.zip . -x "*.DS_Store" "*.git*"
cd ..
```

Verify: unzip into a temp folder and confirm `manifest.json` is at the root level.

---

## Required Store Assets

### Icons
- [x] 128×128 PNG — `extension/icons/128.png` (already exists)
- [ ] Store icon: 128×128 PNG (same file works)

### Screenshots (required: at least 1)
Dimensions: **1280×800** or **640×400**

Recommended screenshots (capture in Chrome, not Vivaldi, for familiarity):
1. Editor tab — prompt entered, quality score visible, enhancement mode selector
2. Library — several saved prompts with tags, search active
3. A/B Test — two prompts side by side with results
4. Composer — multi-block prompt assembled from library entries
5. Dark mode full view showing overall UI

Capture tips:
- Use a clean Chrome profile (no other extensions visible)
- Set window to exactly 1280×800 before capture
- Include realistic prompt content, not lorem ipsum

### Promotional Images (optional but recommended)
- Small promo tile: 440×280 PNG
- Marquee promo tile: 1400×560 PNG

---

## Store Listing Fields

| Field | Value |
|---|---|
| Name | Prompt Lab — AI Prompt Workbench |
| Short description | See cws-listing-copy.md |
| Full description | See cws-listing-copy.md |
| Category | Productivity |
| Language | English |
| Privacy policy URL | https://promptlab.tools/privacy |
| Website | https://promptlab.tools |
| Support URL | https://github.com/DaveHomeAssist/prompt-lab/issues |

---

## Privacy Tab

### Single purpose description
"Prompt Lab provides a prompt engineering workspace in the browser sidebar for writing, enhancing, comparing, and organizing AI prompts."

### Permission justifications
| Permission | Justification |
|---|---|
| `storage` | Stores the user's API key securely in the extension's isolated storage area, separate from page context |

### Data usage declarations
- [ ] "I do not sell or transfer user data to third parties" ✓
- [ ] "I do not use or transfer user data for purposes unrelated to the item's single purpose" ✓
- [ ] "I do not use or transfer user data to determine creditworthiness or for lending purposes" ✓

### Host permissions
None required — API calls originate from the background service worker, not content scripts.

---

## Pre-Submission Validation

- [ ] Load the ZIP as an unpacked extension in a clean Chrome profile
- [ ] Verify options page loads and accepts an API key
- [ ] Verify a prompt enhancement completes successfully
- [ ] Verify library save/load works
- [ ] Verify A/B test runs both variants
- [ ] Verify Composer drag and assembly
- [ ] Verify Pad auto-save
- [ ] Verify dark/light mode toggle
- [ ] Check console for errors — zero tolerance on submission build
- [ ] Confirm no `eval()`, `new Function()`, or inline scripts (MV3 CSP violation)

---

## Submission

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **New Item**
3. Upload `prompt-lab-v1.0.0.zip`
4. Fill all listing fields from cws-listing-copy.md
5. Upload screenshots
6. Complete Privacy tab declarations
7. Set visibility to **Public**
8. Click **Submit for review**

Review typically takes 1–3 business days. Monitor the developer dashboard and the registered email for status updates or requests for changes.

---

## Post-Approval

- [ ] Copy the Chrome Web Store URL
- [ ] Update promptlab.tools landing page with install CTA link
- [ ] Update GitHub README with Web Store badge/link
- [ ] Set up GitHub Actions for automated updates (requires CWS API credentials from developer dashboard)

---

## Common Rejection Reasons (avoid these)

1. **Over-requesting permissions** — only request `storage`, nothing else
2. **Vague single-purpose description** — be specific about what the extension does
3. **Missing privacy policy** — must be a live URL, not a placeholder
4. **Inline scripts or eval** — MV3 CSP violation, instant reject
5. **Misleading description** — don't claim features that aren't shipped
6. **Broken functionality** — test in a clean profile, not your dev environment
