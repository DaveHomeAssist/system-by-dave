'use strict';
const el = id => document.getElementById(id);
const canvas = el('flyer');
const ctx = canvas.getContext('2d');
let project, background, images, generation = 0, busy = false, dirty = false;
const sampleFilename = 'optical-study.flyer.json';
const sampleLimit = 128 * 1024;
const report = message => { el('status').textContent = message; };
const allowedImage = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
function loadImage(src) {
  if (typeof src !== 'string' || !allowedImage.test(src)) throw Error('Choose a PNG, JPEG or WebP image.');
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}
function current() { return project.layers[el('slot').selectedIndex]; }
function controls() {
  el('project').disabled = el('open-sample').disabled = el('reopen-sample').disabled = busy;
  el('reopen-sample').hidden = !project;
  el('fields').disabled = el('save').disabled = el('export').disabled = !project || busy;
  if (!project) return;
  el('wording').value = current().text;
  el('logo-label').hidden = current().kind !== 'artist';
  el('logo').value = '';
}
function draw() {
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  project.layers.forEach((layer, index) => {
    const [x,y,w,h] = layer.box;
    const image = layer.logo ? images[index].logo : layer.text === layer.original ? images[index].art : null;
    if (image) {
      const scale = Math.min(w/image.width, h/image.height);
      ctx.drawImage(image, x+(w-image.width*scale)/2, y+(h-image.height*scale)/2, image.width*scale, image.height*scale);
    } else if (layer.text.trim()) {
      ctx.save();
      const fontSize = Math.max(12, Math.round(h * (layer.kind === 'artist' ? .56 : .65)));
      ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8faff'; ctx.shadowColor = '#030814'; ctx.shadowBlur = 4;
      ctx.fillText(layer.text, x+w/2, y+h/2, w*.97);
      ctx.restore();
    }
  });
}
function exportStem(name) {
  const stem = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().slice(0, 100).replace(/[. ]+$/, '');
  if (!stem) return 'Envision';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem) ? '_' + stem : stem;
}
async function openLayout(data, filename = '') {
  if (data?.format !== 'nnc-layout-1' || !Array.isArray(data.layers) || data.layers.length !== 11) throw Error('Choose an Envision .flyer.json layout.');
  for (const layer of data.layers) {
    if (!['artist','info'].includes(layer.kind) || !['label','text','original'].every(k => typeof layer[k] === 'string' && layer[k].length <= 200) ||
        !Array.isArray(layer.box) || layer.box.length !== 4 || !layer.box.every(Number.isFinite) || layer.box[2]<=0 || layer.box[3]<=0) throw Error('Invalid layout layer.');
  }
  const bg = await loadImage(data.background);
  if (bg.width !== 615 || bg.height !== 768) throw Error('Invalid background dimensions.');
  const loaded = await Promise.all(data.layers.map(async layer => ({
    art: await loadImage(layer.art), logo: layer.logo ? await loadImage(layer.logo) : null
  })));
  const importedName = filename.replace(/(?:\.flyer)?\.json$/i, '');
  data.eventName = (typeof data.eventName === 'string' && data.eventName.trim() || importedName || 'Envision').trim().slice(0, 100);
  el('event-name').value = data.eventName;
  project = data; background = bg; images = loaded;
  el('slot').replaceChildren(...data.layers.map(layer => new Option(layer.label)));
  canvas.hidden = false; el('empty').hidden = true; dirty = false;
  draw(); controls(); report('Layout open.');
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function importLayout(readText, filename) {
  if (busy || (dirty && !confirm('Open another layout and discard your unsaved edits?'))) return false;
  busy = true; controls();
  report('Opening layout…');
  try {
    await openLayout(JSON.parse(await readText()), filename);
    el('file-options-title').textContent = 'Open another layout';
    el('file-options').open = false;
    return true;
  } catch (error) {
    report('Could not open layout. ' + error.message);
    return false;
  } finally {
    busy = false; controls();
  }
}
el('project').onchange = event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  return importLayout(() => {
    if (file.size > 40*1024*1024) throw Error('Layout exceeds 40 MB.');
    return file.text();
  }, file.name);
};
async function readSample() {
  const response = await fetch('./' + sampleFilename, {
    mode: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(10000)
  });
  if (!response.ok || !response.body) throw Error('Sample layout unavailable.');
  if (Number(response.headers.get('content-length')) > sampleLimit) throw Error('Sample layout exceeds 128 KB.');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > sampleLimit) {
        await reader.cancel();
        throw Error('Sample layout exceeds 128 KB.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Blob(chunks).text();
}
async function openSample() {
  const button = this;
  const restoreFocus = document.activeElement === button;
  const opened = await importLayout(readSample, sampleFilename);
  if (restoreFocus && document.activeElement === document.body) {
    (opened ? el('slot') : button).focus();
  }
}
el('open-sample').onclick = el('reopen-sample').onclick = openSample;
el('event-name').oninput = event => {
  project.eventName = event.target.value.trim();
  dirty = true; report('Unsaved download name.');
};
el('slot').onchange = controls;
el('wording').oninput = event => {
  const layer = current(); layer.text = event.target.value; delete layer.logo;
  dirty = true; generation++; draw(); report('Unsaved edits.');
};
el('reset').onclick = () => {
  const layer = current(); layer.text = layer.original; delete layer.logo;
  dirty = true; generation++; controls(); draw(); report('Original layer restored. Save your copy.');
};
el('logo').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  const layer = current(), index = el('slot').selectedIndex, version = ++generation;
  busy = true; controls();
  try {
    if (file.size > 3*1024*1024) throw Error('Choose an image smaller than 3 MB.');
    const source = await new Promise((resolve,reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    });
    const image = await loadImage(source);
    if (version !== generation) return;
    images[index].logo = image; layer.logo = source; dirty = true;
    draw(); report('Logo replaced. Save your copy.');
  } catch { report('Choose a PNG, JPEG or WebP logo under 3 MB.'); }
  finally { busy = false; controls(); }
};
el('save').onclick = () => {
  if (!el('event-name').reportValidity() || !project.eventName) { el('event-name').focus(); return; }
  download(new Blob([JSON.stringify(project)],{type:'application/json'}), exportStem(project.eventName) + '.flyer.json');
  dirty = false; report('Editable copy prepared for download.');
};
el('export').onclick = () => {
  if (!el('event-name').reportValidity() || !project.eventName) { el('event-name').focus(); return; }
  const filename = exportStem(project.eventName) + '.png';
  canvas.toBlob(blob => {
    if (blob) download(blob, filename);
    report(blob ? 'PNG prepared for download.' : 'PNG export failed.');
  });
};
addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
function theme(value) {
  document.documentElement.dataset.theme = value;
  el('theme').textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
}
try { theme(localStorage.getItem('sbd-theme') === 'dark' ? 'dark' : 'light'); } catch {}
el('theme').onclick = () => {
  theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  try { localStorage.setItem('sbd-theme',document.documentElement.dataset.theme); } catch {}
};
