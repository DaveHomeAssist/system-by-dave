/* The retreat editor publishes only the fields explicitly approved for visitors. */
(() => {
  const endpoint = 'https://davehomeassist.github.io/new-bethlehem-editor/retreat.json';

  function link(text, href) {
    const element = document.createElement('a');
    element.textContent = text;
    element.href = href;
    return element;
  }

  function registrationLink(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) {
        const registration = link('Register for the retreat', url.href);
        registration.rel = 'noopener noreferrer';
        return registration;
      }
    } catch { /* Leave the registration information in its pending state. */ }
    return null;
  }

  function addRow(list, label, value) {
    if (!value) return;
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.append(value);
    row.append(term, description);
    list.append(row);
  }

  function updateDetails(data) {
    if (data?.schema !== 1) return;
    const value = key => typeof data[key] === 'string' ? data[key].trim() : '';
    const welcome = document.querySelector('[data-retreat="welcome"]');
    if (welcome && value('welcome')) {
      welcome.textContent = value('welcome');
      document.querySelector('[data-retreat-fallback]')?.remove();
    }

    const visit = document.querySelector('[data-retreat="visit"]');
    if (visit) {
      const list = document.createElement('dl');
      list.className = 'facts';
      addRow(list, 'Date', value('dateLabel'));
      addRow(list, 'Time', value('timeLabel'));
      addRow(list, 'Location', value('venue'));
      addRow(list, 'Address', value('address'));
      addRow(list, 'Registration', registrationLink(value('registrationUrl')));
      visit.replaceChildren(list.childElementCount ? list : 'The date, location, and registration information will be posted here when available.');
    }

    const registration = document.querySelector('[data-retreat="registration"]');
    const register = registrationLink(value('registrationUrl'));
    if (registration) {
      if (register) registration.replaceChildren(register);
      else registration.replaceChildren('Registration details will appear on the ', link('retreat details page', 'retreats.html'), ' when available.');
    }

    const contact = document.querySelector('[data-retreat="contact"]');
    if (contact) {
      const list = document.createElement('dl');
      list.className = 'facts';
      addRow(list, 'Contact', value('contactName'));
      const email = value('email');
      const phone = value('phone');
      if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(email)) addRow(list, 'Email', link(email, 'mailto:' + email));
      if (/^\+?[\d ().-]{7,24}$/.test(phone)) addRow(list, 'Phone', link(phone, 'tel:' + phone.replace(/[^\d+]/g, '')));
      contact.replaceChildren(list.childElementCount ? list : 'Contact information for New Bethlehem will be shared here when available.');
    }
  }

  async function loadPublishedDetails() {
    try {
      const response = await fetch(endpoint, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache'});
      if (response.ok) updateDetails(await response.json());
    } catch {
      // The static retreat introduction and visitor information remain readable.
    }
  }

  loadPublishedDetails();
})();
