import { describe, expect, it } from "vitest";
import { viewsGanhas } from "./ganho";

describe("views ganhas no dia", () => {
  it("vídeo acompanhado: diferença entre os totais", () => {
    expect(viewsGanhas(10_000, 13_500, "2026-10-01", "2026-10-20")).toBe(3_500);
  });
  it("rede recontou para baixo: não fica negativo", () => {
    expect(viewsGanhas(10_000, 9_800, "2026-10-01", "2026-10-20")).toBe(0);
  });
  it("vídeo novo, postado no dia: conta tudo", () => {
    expect(viewsGanhas(null, 42_000, "2026-10-20", "2026-10-20")).toBe(42_000);
  });
  it("vídeo antigo visto pela primeira vez: só marca o ponto de partida", () => {
    expect(viewsGanhas(null, 900_000, "2026-08-10", "2026-10-20")).toBe(0);
  });
});
