/** Mapas da Onial e os temas de cada um (os mesmos da aba Ideias & roteiros). */
export const MAPAS = [
  { id: "1v1", nome: "Onial 1V1 Reload All Guns", falado: "Onial 1v1", emoji: "⭐", temas: ["Farm de XP", "Armas personalizadas", "Elementais"] },
  { id: "aim", nome: "Onial Practice Aim Edit Piece", falado: "Onial Practice", emoji: "🎯", temas: ["Sensibilidades", "Treinos"] },
] as const;
export const DURACOES = [30, 45, 60] as const;

/** Nome curto usado em Dias de postagem. */
export const NOME_CURTO: Record<string, string> = { "1v1": "Onial 1v1 Reload", aim: "Mapa de treino" };

/** 3 opções do dia: o mapa do dia, o outro mapa e o mapa do dia de novo. */
export function mapasDasOpcoes(mapaDoDia: string): string[] {
  const outro = MAPAS.find((m) => m.id !== mapaDoDia)?.id ?? mapaDoDia;
  return [mapaDoDia, outro, mapaDoDia];
}
