import "server-only";

/** Modelo usado nas ferramentas de IA (melhor custo-benefício para roteiros). */
export const MODELO = "claude-sonnet-5-5";
// preço por milhão de tokens (US$): entrada e saída
const PRECO = { entrada: 2, saida: 10 };

export interface RespostaIA<T> { dados: T; tokensEntrada: number; tokensSaida: number; custoUsd: number }

export function iaConfigurada() {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

/** Pede à IA uma resposta em JSON que segue o formato (schema) informado. */
export async function pedirJson<T>(opcoes: { sistema: string; mensagem: string; schema: object; maxTokens?: number }): Promise<RespostaIA<T>> {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) throw new Error("A IA ainda não foi configurada pelo gestor.");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: opcoes.maxTokens ?? 4000,
      system: opcoes.sistema,
      thinking: { type: "between_tools" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: opcoes.schema } },
      messages: [{ role: "user", content: opcoes.mensagem }],
    }),
  });
  const corpo = await r.text();
  if (!r.ok) {
    console.error("IA", r.status, corpo.slice(0, 500));
    if (r.status === 401) throw new Error("A chave da IA está errada. Avise o gestor.");
    if (r.status === 429) throw new Error("A IA está ocupada agora. Tente de novo em 1 minuto.");
    if (/credit|billing/i.test(corpo)) throw new Error("Acabou o crédito da IA. Avise o gestor.");
    throw new Error("A IA não respondeu. Tente de novo.");
  }
  const d = JSON.parse(corpo) as { content: { type: string; text?: string }[]; stop_reason: string; usage: { input_tokens: number; output_tokens: number } };
  if (d.stop_reason === "refusal") throw new Error("A IA não quis gerar esse conteúdo. Revise o texto e tente de novo.");
  if (d.stop_reason === "max_tokens") throw new Error("O texto ficou longo demais. Tente um roteiro menor.");
  const texto = d.content.find((b) => b.type === "text")?.text ?? "";
  const custoUsd = (d.usage.input_tokens * PRECO.entrada + d.usage.output_tokens * PRECO.saida) / 1_000_000;
  return { dados: JSON.parse(texto) as T, tokensEntrada: d.usage.input_tokens, tokensSaida: d.usage.output_tokens, custoUsd };
}
