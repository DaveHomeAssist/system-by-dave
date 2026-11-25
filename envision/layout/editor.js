'use strict';
const el = id => document.getElementById(id);
const canvas = el('flyer');
const ctx = canvas.getContext('2d');
let project, background, images, generation = 0, busy = false, dirty = false;
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
async function openLayout(data) {
  if (data?.format !== 'nnc-layout-1' || !Array.isArray(data.layers) || data.layers.length !== 11) throw Error('Choose an AfterJinx .flyer.json layout.');
  for (const layer of data.layers) {
    if (!['artist','info'].includes(layer.kind) || !['label','text','original'].every(k => typeof layer[k] === 'string' && layer[k].length <= 200) ||
        !Array.isArray(layer.box) || layer.box.length !== 4 || !layer.box.every(Number.isFinite) || layer.box[2]<=0 || layer.box[3]<=0) throw Error('Invalid layout layer.');
  }
  const bg = await loadImage(data.background);
  if (bg.width !== 615 || bg.height !== 768) throw Error('Invalid background dimensions.');
  const loaded = await Promise.all(data.layers.map(async layer => ({
    art: await loadImage(layer.art), logo: layer.logo ? await loadImage(layer.logo) : null
  })));
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
el('project').onchange = async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file || busy || (dirty && !confirm('Open another layout and discard your unsaved edits?'))) return;
  busy = true; controls(); el('project').disabled = true;
  try {
    if (file.size > 40*1024*1024) throw Error('Layout exceeds 40 MB.');
    await openLayout(JSON.parse(await file.text()));
  } catch (error) { report('Could not open layout. ' + error.message); }
  finally { busy = false; el('project').disabled = false; controls(); }
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
  busy = true; controls(); el('project').disabled = true;
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
  finally { busy = false; el('project').disabled = false; controls(); }
};
el('save').onclick = () => {
  download(new Blob([JSON.stringify(project)],{type:'application/json'}),'AfterJinx.flyer.json');
  dirty = false; report('Editable copy prepared for download.');
};
el('export').onclick = () => canvas.toBlob(blob => {
  if (blob) download(blob,'AfterJinx.png');
  report(blob ? 'PNG prepared for download.' : 'PNG export failed.');
});
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
