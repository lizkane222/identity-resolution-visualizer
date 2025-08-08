
import Papa from 'papaparse';

function parseBracedEquals(input) {
  if (typeof input !== 'string') return input;
  let s = input.trim();

  if (!s.startsWith('{') || !s.includes('=')) return null;

  
  if (s.endsWith('},')) s = s.slice(0, -1);
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);

  const out = {};
  let buf = '';
  let depth = 0;
  const parts = [];

  // split on commas only when depth===0 (so nested {...} stays intact)
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);

    if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  const coerce = (val) => {
    const t = val.trim();
    if (!t) return '';
    // Nested proper JSON on RHS
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return JSON.parse(t); } catch { /* fall through */ }
    }
    // Strip surrounding quotes
    const unq = t.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (/^-?\d+(\.\d+)?$/.test(unq)) return Number(unq);
    if (/^(true|false)$/i.test(unq)) return /^true$/i.test(unq);
    if (/^null$/i.test(unq)) return null;
    return unq;
  };

  for (const kv of parts) {
    const eqIdx = kv.indexOf('=');
    if (eqIdx === -1) continue;
    const key = kv.slice(0, eqIdx).trim();
    const raw = kv.slice(eqIdx + 1).trim().replace(/,?$/, ''); // drop trailing comma on value
    if (!key) continue;
    out[key] = coerce(raw);
  }

  return out;
}

export function parseCSV(text) {
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    // transformHeader: h => h.trim().toUpperCase(),
  });

  if (errors.length) {
    console.error('❌ CSV Parsing Errors:', errors);
  }

  const cleanedData = data.map((row, idx) => {
    const cleaned = {};
    Object.entries(row).forEach(([k, v]) => {
      let trimmed = (v ?? '').toString().trim();

      // Remove hidden whitespace aggressively
      trimmed = trimmed.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

      // 1) Try native JSON
      if (/^[\[\{]/.test(trimmed)) {
        try {
          cleaned[k] = JSON.parse(trimmed);
          return;
        } catch {
          // 2) Try {key=value,...} parser (Athena-ish)
          const kvObj = parseBracedEquals(trimmed);
          if (kvObj) {
            cleaned[k] = kvObj;
            return;
          }
          // 3) Fallback: split into array of tokens
          cleaned[k] = trimmed
            .replace(/^[\[\{]+|[\]\}]+$/g, '')
            .split(',')
            .map(s => s.replace(/["']/g, '').trim())
            .filter(Boolean);
          return;
        }
      }

      // Plain scalar
      cleaned[k] = trimmed;
    });

    if (idx < 3) console.log(`Parsed row ${idx + 1}:`, cleaned);
    return cleaned;
  });

  return cleanedData;
}
