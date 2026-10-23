// AV by Dave demos: site-level configuration.
// Fill these in and commit; nothing else needs to change.
window.SBD_DEMOS = {
  // Umami Cloud: the website ID from the "Tracking code" section of the Umami dashboard.
  // Leave empty to run with no analytics (every track() call becomes a no-op).
  umamiWebsiteId: '',
  umamiScript: 'https://cloud.umami.is/script.js',

  // Post-completion email ask. The form posts straight to the provider (no JavaScript),
  // so a static site can use it. Leave emailFormAction empty to hide the form.
  //   Buttondown: 'https://buttondown.com/api/emails/embed-subscribe/<username>', field 'email'
  //   Kit:        paste the action URL and field name from the form's HTML embed
  // beehiiv hosted subscribe page (Dave's choice, 2026-10-19). Replace the whole
  // placeholder with the publication's public subscribe URL, e.g.
  // 'https://YOURPUB.beehiiv.com/subscribe'. When it's a valid https beehiiv.com
  // link, the ask becomes a button to that page (UTM-tagged, new tab) and
  // emailFormAction is ignored. Anything else (this placeholder, '', a typo)
  // leaves the ask exactly as it is without it. No CSP change: it's a link.
  emailSubscribeUrl: '[DAVE: beehiiv subscribe URL]',

  emailFormAction: '',
  emailFieldName: 'email',
  emailTag: 'demos',           // Buttondown: sent as a hidden "tag" input; ignored elsewhere

  // Optional second action after completion. Leave empty to hide.
  // The demos live on systembydave.com and the Field Kit on avbydave.com, so this
  // is an absolute, UTM-tagged link (a navigation, so the demo CSP doesn't block it).
  checklistUrl: 'https://avbydave.com/field-kit/?utm_source=systembydave&utm_medium=demo&utm_campaign=demos&utm_content=completion',
  checklistLabel: 'Get the Field Kit',
};
