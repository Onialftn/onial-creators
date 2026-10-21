/** Corte de silêncios e respirações, feito no navegador (mesma lógica do protótipo). */
export type Nivel = "leve" | "media" | "forte";
export interface Regiao { s: number; e: number; t: "sil" | "breath" }

const PARAMS: Record<Nivel, { k: number; minSil: number; pad: number }> = {
  leve: { k: 0.12, minSil: 0.7, pad: 0.12 },
  media: { k: 0.2, minSil: 0.4, pad: 0.08 },
  forte: { k: 0.28, minSil: 0.25, pad: 0.05 },
};

export function mono(buf: AudioBuffer): Float32Array {
  const n = buf.length, out = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels;
  }
  return out;
}

export function analisar(buf: AudioBuffer, nivel: Nivel): Regiao[] {
  const P = PARAMS[nivel];
  const sr = buf.sampleRate, m = mono(buf), fl = Math.round(sr * 0.02), nF = Math.floor(m.length / fl), db = new Float32Array(nF);
  for (let f = 0; f < nF; f++) {
    let s = 0;
    for (let i = f * fl; i < (f + 1) * fl; i++) s += m[i] * m[i];
    db[f] = 10 * Math.log10(s / fl + 1e-12);
  }
  const ord = Array.from(db).sort((a, b) => a - b);
  const piso = ord[Math.floor(nF * 0.1)] ?? -90, fala = ord[Math.floor(nF * 0.9)] ?? -10, faixa = Math.max(6, fala - piso);
  const silT = piso + faixa * P.k, resT = Math.max(silT + 3, fala - 20), fd = fl / sr, out: Regiao[] = [];
  let f = 0;
  while (f < nF) {
    if (db[f] < silT) {
      let g = f; while (g < nF && db[g] < silT) g++;
      if ((g - f) * fd >= P.minSil) { const s = f * fd + P.pad, e = g * fd - P.pad; if (e > s) out.push({ s, e, t: "sil" }); }
      f = g; continue;
    }
    if (db[f] < resT) {
      let g = f; while (g < nF && db[g] < resT && db[g] >= silT) g++;
      const dur = (g - f) * fd, antes = f > 0 && db[f - 1] < silT, depois = g < nF && db[g] < silT;
      if (dur >= 0.12 && dur <= 0.9 && (antes || depois)) out.push({ s: f * fd, e: g * fd, t: "breath" });
      f = Math.max(g, f + 1); continue;
    }
    f++;
  }
  out.sort((a, b) => a.s - b.s);
  const junt: Regiao[] = [];
  for (const r of out) { const l = junt[junt.length - 1]; if (l && r.s <= l.e + 0.02) { l.e = Math.max(l.e, r.e); if (r.t === "sil") l.t = "sil"; } else junt.push({ ...r }); }
  return junt;
}

export function renderizar(ctx: BaseAudioContext, buf: AudioBuffer, regs: Regiao[], normalizar: boolean) {
  const sr = buf.sampleRate, manter: [number, number][] = [];
  let t = 0;
  for (const r of regs) { if (r.s > t) manter.push([t, r.s]); t = Math.max(t, r.e); }
  if (t < buf.duration) manter.push([t, buf.duration]);
  const fade = Math.round(sr * 0.005);
  const total = manter.reduce((s, k) => s + Math.round((k[1] - k[0]) * sr), 0);
  const ob = ctx.createBuffer(buf.numberOfChannels, Math.max(1, total), sr);
  let pico = 1e-9;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c), dst = ob.getChannelData(c);
    let o = 0;
    for (const k of manter) {
      const a = Math.round(k[0] * sr), len = Math.round(k[1] * sr) - a;
      for (let i = 0; i < len; i++) { let v = src[a + i] || 0; if (i < fade) v *= i / fade; if (len - i < fade) v *= (len - i) / fade; dst[o + i] = v; if (Math.abs(v) > pico) pico = Math.abs(v); }
      o += len;
    }
  }
  let ganhoDb = 0;
  if (normalizar) {
    const g = Math.min(8, Math.pow(10, -1 / 20) / pico);
    ganhoDb = 20 * Math.log10(g);
    for (let c = 0; c < ob.numberOfChannels; c++) { const d = ob.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; }
  }
  return { ob, ganhoDb };
}

/** AudioBuffer → arquivo WAV 16 bits para baixar. */
export function paraWav(buf: AudioBuffer): Blob {
  const nc = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length, bytes = n * nc * 2;
  const dv = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); dv.setUint32(4, 36 + bytes, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, nc, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * nc * 2, true); dv.setUint16(32, nc * 2, true); dv.setUint16(34, 16, true);
  str(36, "data"); dv.setUint32(40, bytes, true);
  const ch = Array.from({ length: nc }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const v = Math.max(-1, Math.min(1, ch[c][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([dv], { type: "audio/wav" });
}
