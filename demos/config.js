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
  emailFormAction: '',
  emailFieldName: 'email',
  emailTag: 'demos',           // Buttondown: sent as a hidden "tag" input; ignored elsewhere

  // Optional second action after completion. Leave empty to hide.
  checklistUrl: '',
  checklistLabel: 'Get the troubleshooting checklist',
};
