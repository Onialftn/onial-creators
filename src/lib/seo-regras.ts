/** Contas do SEO passo a passo (sem banco nem internet), para poder testar. */

/** Junta as tags no formato do YouTube Studio (separadas por vírgula) sem passar de 500 caracteres. */
export function tagsAte500(tags: string[], limite = 500): string {
  const vistas = new Set<string>();
  const ok: string[] = [];
  let tam = 0;
  for (const bruta of tags) {
    const t = bruta.replace(/[<>,#]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!t || t.length > 100 || vistas.has(t)) continue;
    // o YouTube conta aspas em tags com espaço e a vírgula entre elas
    const custo = t.length + (t.includes(" ") ? 2 : 0) + (ok.length ? 1 : 0);
    if (tam + custo > limite) continue;
    vistas.add(t);
    ok.push(t);
    tam += custo;
  }
  return ok.join(",");
}

export interface PostagemCanal { publicadoEm: string; views: number }
export interface Horario { faixa: string; inicio: number; mediana: number; videos: number }

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const mediana = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Hora e dia da semana em Brasília. */
function emBrasilia(iso: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(new Date(iso));
  const hora = Number(p.find((x) => x.type === "hour")?.value ?? 0);
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")?.value ?? "Sun");
  return { hora, dia };
}

/**
 * Melhores horários a partir dos vídeos do canal: agrupa por faixa de 2 horas e por dia da semana
 * e compara a mediana de views (vídeos com menos de 2 dias ficam de fora, ainda estão crescendo).
 */
export function melhoresHorarios(posts: PostagemCanal[], agora = Date.now()) {
  const validos = posts.filter((p) => agora - new Date(p.publicadoEm).getTime() > 2 * 86_400_000);
  const porFaixa = new Map<number, number[]>();
  const porDia = new Map<number, number[]>();
  for (const p of validos) {
    const { hora, dia } = emBrasilia(p.publicadoEm);
    const f = Math.floor(hora / 2) * 2;
    porFaixa.set(f, [...(porFaixa.get(f) ?? []), p.views]);
    porDia.set(dia, [...(porDia.get(dia) ?? []), p.views]);
  }
  const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
  const faixas: Horario[] = [...porFaixa]
    .filter(([, v]) => v.length >= 2)
    .map(([inicio, v]) => ({ faixa: `${hh(inicio)} às ${hh((inicio + 2) % 24)}`, inicio, mediana: mediana(v), videos: v.length }))
    .sort((a, b) => b.mediana - a.mediana);
  const dias = [...porDia]
    .filter(([, v]) => v.length >= 2)
    .map(([d, v]) => ({ dia: DIAS[d], mediana: mediana(v), videos: v.length }))
    .sort((a, b) => b.mediana - a.mediana);
  return { analisados: validos.length, faixas: faixas.slice(0, 3), dias: dias.slice(0, 3), suficiente: validos.length >= 8 && faixas.length > 0 };
}
