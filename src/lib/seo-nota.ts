/** Contas do SEO (sem banco nem internet), para poder testar. */

const PARADAS = new Set("a o e de da do das dos em no na nos nas um uma para pra com que por se é eu meu minha seu sua isso esse essa the a an of in on to for and is it my you your this that with at i fortnite shorts".split(" "));

/** Palavras de um texto, sem acento, sem palavras vazias. */
export function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/#\w+/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !PARADAS.has(p));
}

/** As mais frequentes de uma lista, com a contagem. */
export function maisFrequentes(itens: string[], n: number): { item: string; qtd: number }[] {
  const c = new Map<string, number>();
  for (const i of itens) c.set(i, (c.get(i) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([item, qtd]) => ({ item, qtd }));
}

/**
 * Nota da palavra-chave (0 a 100): procura alta (views por dia dos Shorts que aparecem) e concorrência baixa
 * (quantos vídeos existem) dão nota alta.
 */
export function notaPalavraChave(medianaPorDia: number, totalResultados: number): { nota: number; procura: "baixa" | "média" | "alta"; concorrencia: "baixa" | "média" | "alta" } {
  // procura: 0 a 100 em escala log (100 views/dia ≈ 30, 10 mil/dia ≈ 80, 100 mil/dia = 100)
  const p = Math.max(0, Math.min(100, (Math.log10(Math.max(1, medianaPorDia)) / 5) * 100));
  // concorrência: 0 a 100 em escala log (1 mil vídeos ≈ 30, 100 mil ≈ 60, 1 milhão+ = 100)
  const c = Math.max(0, Math.min(100, ((Math.log10(Math.max(1, totalResultados)) - 2) / 4) * 100));
  const nota = Math.round(Math.max(0, Math.min(100, p * 0.65 + (100 - c) * 0.35)));
  const faixa = (v: number) => (v >= 66 ? "alta" : v >= 40 ? "média" : "baixa") as "baixa" | "média" | "alta";
  return { nota, procura: faixa(p), concorrencia: faixa(c) };
}

export interface ItemNota { ok: boolean; texto: string; peso: number }

/** Nota do título (0 a 100) com o checklist do que melhorar. */
export function notaTitulo(titulo: string, palavraChave: string, palavrasEmAlta: string[] = []): { nota: number; itens: ItemNota[] } {
  const t = titulo.trim();
  const sem = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const chave = palavras(palavraChave);
  const doTitulo = new Set(palavras(t));
  const emojis = (t.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const letras = t.replace(/[^A-Za-zÀ-ú]/g, "");
  const maiusc = letras.length ? letras.replace(/[^A-ZÀ-Þ]/g, "").length / letras.length : 0;
  const alta = palavrasEmAlta.filter((p) => doTitulo.has(p));
  const itens: ItemNota[] = [
    { ok: t.length >= 20 && t.length <= 60, texto: t.length < 20 ? `Curto demais (${t.length} letras): use de 20 a 60` : t.length > 60 ? `Longo demais (${t.length} letras): no Shorts, até 60 aparece inteiro` : `Tamanho bom (${t.length} letras)`, peso: 20 },
    { ok: /fortnite/.test(sem), texto: /fortnite/.test(sem) ? "Tem a palavra Fortnite" : "Coloque a palavra Fortnite", peso: 15 },
    { ok: chave.length > 0 && chave.every((p) => doTitulo.has(p)), texto: !chave.length ? "Escolha uma palavra-chave acima para conferir" : chave.every((p) => doTitulo.has(p)) ? "Tem a sua palavra-chave" : `Coloque a palavra-chave ("${palavraChave.trim()}")`, peso: 25 },
    { ok: alta.length > 0, texto: !palavrasEmAlta.length ? "Pesquise a palavra-chave para ver as palavras em alta" : alta.length ? `Usa palavra em alta: ${alta.slice(0, 3).join(", ")}` : `Use uma palavra em alta (ex.: ${palavrasEmAlta.slice(0, 3).join(", ")})`, peso: 15 },
    { ok: /\d/.test(t) || /\?|!/.test(t), texto: /\d/.test(t) || /\?|!/.test(t) ? "Tem número ou pergunta/exclamação (prende a atenção)" : "Um número ou uma pergunta costuma prender mais", peso: 10 },
    { ok: emojis <= 1, texto: emojis <= 1 ? "Emojis na medida" : `Muitos emojis (${emojis}): use no máximo 1`, peso: 7 },
    { ok: maiusc < 0.5, texto: maiusc < 0.5 ? "Sem excesso de LETRAS MAIÚSCULAS" : "Muitas MAIÚSCULAS: destaque só 1 ou 2 palavras", peso: 8 },
  ];
  const nota = t ? itens.reduce((a, i) => a + (i.ok ? i.peso : 0), 0) : 0;
  return { nota, itens };
}
