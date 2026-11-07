import { createHash } from 'node:crypto';

// Bounded EDID 1.x base-block decoder. Extension bytes are retained, not guessed.
export function decodeEdid(hex) {
  if (typeof hex !== 'string' || !/^(?:[a-f\d]{2}){128,4096}$/i.test(hex)) return { state: 'invalid', reason: 'Invalid EDID length or encoding.' };
  const b = Buffer.from(hex, 'hex');
  if (b.subarray(0, 8).toString('hex') !== '00ffffffffffff00' || b.length % 128 || b.length !== (b[126] + 1) * 128) return { state: 'invalid', reason: 'Invalid header or incomplete extension blocks.' };
  for (let i = 0; i < b.length; i += 128) if (b.subarray(i, i + 128).reduce((a, v) => a + v, 0) % 256) return { state: 'invalid', reason: 'EDID checksum failed.' };
  if (b[18] !== 1) return { state: 'unsupported', reason: 'Only EDID version 1 is decoded.' };
  const vendor = b.readUInt16BE(8);
  const manufacturer = [10, 5, 0].map(s => String.fromCharCode(64 + ((vendor >> s) & 31))).join('');
  let name = null;
  const detailedTimings = [];
  for (let offset = 54; offset <= 108; offset += 18) {
    const d = b.subarray(offset, offset + 18), clock = d.readUInt16LE(0) * 10000;
    if (!clock) {
      if (d[3] === 0xfc) name = d.subarray(5, 18).toString('ascii').replace(/[^\x20-\x7e]/g, '').trim();
      continue;
    }
    const width = d[2] + ((d[4] >> 4) << 8), hb = d[3] + ((d[4] & 15) << 8);
    const height = d[5] + ((d[7] >> 4) << 8), vb = d[6] + ((d[7] & 15) << 8);
    // Interlaced descriptors need field/frame handling; preserve that boundary explicitly.
    if (!width || !height || (d[17] & 128)) continue;
    detailedTimings.push({ width, height, refreshHz: Math.round(clock / ((width + hb) * (height + vb)) * 100) / 100, preferred: offset === 54 && !!(b[24] & 2) });
  }
  return { state: 'reported', source: 'macOS IORegistry', fingerprint: createHash('sha256').update(b).digest('hex'), rawHex: b.toString('hex'), manufacturer, vendorId: vendor, productId: b.readUInt16LE(10), name, version: `${b[18]}.${b[19]}`, extensionCount: b[126], detailedTimings, reason: 'Base-block progressive detailed timings only; extensions and other modes are retained in raw data, not decoded. Advertised capabilities are not the active signal.' };
}

export function parseRegistryEdids(output) {
  const records = [];
  for (const block of String(output).split(/(?=^[ |]*\+-o )/m)) {
    const hex = block.match(/"IODisplayEDID"\s*=\s*<([a-f\d]+)>/i)?.[1];
    if (hex) records.push(decodeEdid(hex));
    if (records.length === 32) break;
  }
  return records;
}

export function attachEdids(displays, edids) {
  const number = value => value == null || value === '' ? NaN : Number(value);
  const matches = (display, edid) => edid.state === 'reported' && number(display.manufacturerId) === edid.vendorId && number(display.productId) === edid.productId;
  return displays.map(display => {
    const candidates = edids.filter(edid => matches(display, edid));
    const uniqueDisplay = displays.filter(other => number(other.manufacturerId) === number(display.manufacturerId) && number(other.productId) === number(display.productId)).length === 1;
    return { ...display, edid: candidates.length === 1 && uniqueDisplay ? candidates[0] : { state: candidates.length ? 'ambiguous' : 'unavailable', reason: candidates.length ? 'Identical display identifiers: automatic association withheld.' : 'macOS did not expose a uniquely matching EDID.' } };
  });
}
