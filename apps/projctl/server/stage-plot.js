import fs from 'node:fs/promises';
import { normalizePlot } from '../public/stage-plot.js';

export async function readStagePlot(file) {
  try {
    if ((await fs.stat(file)).size > 64000) throw new Error('Stage plot is too large. Limit it to 64 KB.');
    return normalizePlot(JSON.parse(await fs.readFile(file, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    // Keep private paths and raw file contents out of API errors.
    throw new Error('Stage plot could not be loaded. Check the local plot file and reload.');
  }
}
