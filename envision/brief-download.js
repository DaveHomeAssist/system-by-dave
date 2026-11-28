(function () {
  'use strict';

  window.downloadEnvisionBrief = function ({kind, title, prompt, copy}) {
    const brief = {format: 'envision-brief-1', kind, title, prompt};
    if (kind === 'show') brief.copy = copy || '';

    let stem = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().slice(0, 100).replace(/[. ]+$/, '');
    if (!stem) stem = 'Envision';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = '_' + stem;

    const url = URL.createObjectURL(new Blob([JSON.stringify(brief)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = stem + '.brief.json';
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
})();
