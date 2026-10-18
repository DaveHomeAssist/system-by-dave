/* Launch configuration for the AV by Dave frame-sync demo and Field Kit
   (docs/launch/README.md). Every external service is off until Dave picks it
   and creates the account; leaving a value empty keeps the matching feature in
   its safe fallback. Change only this file to turn a feature on, then follow
   the checklist in docs/launch/README.md (CSP, privacy policy, CHANGELOG). */
window.SBD_LAUNCH = {
  // Analytics: null keeps js/sbd-events.js a no-op. See docs/launch/analytics.md
  // before setting anything here; the privacy policy must change first.
  analytics: { provider: null },

  // "Get the next demo" signup. With no endpoint the form is replaced by a
  // mailto link to the public address; nothing is collected by the site.
  email: {
    provider: null,          // e.g. the email tool Dave chooses
    endpoint: '',            // HTTPS form endpoint from that tool
    fallbackMailto: 'avbydave@gmail.com'
  },

  // Sync & Signal Field Kit. Empty hides the kit link on the demo page.
  fieldKit: { url: '', priceLabel: 'Price TBD' }
};
