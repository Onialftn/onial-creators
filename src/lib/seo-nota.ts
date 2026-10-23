/** Nota do título para o nicho de Fortnite (conta simples, sem IA). */

const VAZIAS = new Set("a o as os de da do das dos e em no na nos nas um uma uns umas para pra por com sem que se eu voce meu minha seu sua isso esse essa este esta the of to in and is on for shorts fortnite".split(" "));

/** Palavras do texto, sem acento e sem as palavras vazias. */
export function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/#\S+/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 2 && !VAZIAS.has(p) && !/^\d+$/.test(p));
}

/** Palavras que costumam dar clique em Shorts de Fortnite. */
const FORTES = ["melhor", "melhores", "segredo", "secreto", "ninguem", "nunca", "rapido", "facil", "insano", "absurdo", "hacker", "bug", "glitch", "pro", "xp", "nivel", "niveis", "level", "ganhei", "testei", "desafio", "1v1", "sensibilidade", "aim", "mira", "edit", "build", "treino", "infinito", "op", "roubado", "primeiro", "novo", "nova"];

export interface ItemNota { ok: boolean; texto: string; peso: number }

/** Nota do título (0 a 100) com o checklist do que melhorar. */
export function notaTitulo(titulo: string): { nota: number; itens: ItemNota[] } {
  const t = titulo.trim();
  const sem = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const ps = new Set(sem.split(/[^a-z0-9]+/));
  const emojis = (t.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const letras = t.replace(/[^A-Za-zÀ-ú]/g, "");
  const maiusc = letras.length ? letras.replace(/[^A-ZÀ-Þ]/g, "").length / letras.length : 0;
  const fortes = FORTES.filter((f) => ps.has(f));
  const gancho = /\d/.test(t) || /[?!]/.test(t);
  const itens: ItemNota[] = [
    { ok: t.length >= 20 && t.length <= 60, texto: t.length < 20 ? `Curto demais (${t.length} letras): use de 20 a 60` : t.length > 60 ? `Longo demais (${t.length} letras): no Shorts, até 60 aparece inteiro` : `Tamanho bom (${t.length} letras)`, peso: 25 },
    { ok: /fortnite/.test(sem), texto: /fortnite/.test(sem) ? "Tem a palavra Fortnite" : "Coloque a palavra Fortnite (é o que as pessoas buscam)", peso: 20 },
    { ok: fortes.length > 0, texto: fortes.length ? `Tem palavra que chama clique: ${fortes.slice(0, 3).join(", ")}` : "Use uma palavra que chama clique (ex.: melhor, segredo, insano, ninguém)", peso: 20 },
    { ok: gancho, texto: gancho ? "Tem número ou pergunta/exclamação (prende a atenção)" : "Um número ou uma pergunta costuma prender mais", peso: 15 },
    { ok: emojis <= 1, texto: emojis <= 1 ? "Emojis na medida" : `Muitos emojis (${emojis}): use no máximo 1`, peso: 10 },
    { ok: maiusc < 0.5, texto: maiusc < 0.5 ? "Sem excesso de LETRAS MAIÚSCULAS" : "Muitas MAIÚSCULAS: destaque só 1 ou 2 palavras", peso: 10 },
  ];
  const nota = t ? itens.reduce((a, i) => a + (i.ok ? i.peso : 0), 0) : 0;
  return { nota, itens };
}
