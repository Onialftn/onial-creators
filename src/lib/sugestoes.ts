/** Como cada situação da sugestão aparece na tela. */
export const SITUACAO: Record<string, { rotulo: string; classe: string }> = {
  enviada: { rotulo: "Esperando resposta", classe: "pill-tint" },
  aprovada: { rotulo: "Aprovada ✅", classe: "pill-ok" },
  recusada: { rotulo: "Recusada", classe: "pill-warn" },
};
