import { describe, expect, it, vi } from "vitest";
vi.mock("./claude", () => ({ pedirJson: vi.fn() }));
import { aplicarTrocas } from "./roteiro";

describe("trocas no roteiro traduzido", () => {
  it("troca o mapa citado mesmo que a IA esqueça, e cheat vira hacker", () => {
    const r = aplicarTrocas({ titulo: "t", mapa_citado: "Infinite 1v1", mapa_trocado: true, falas: ["O que acontece no Infinite 1v1?", "Meu Deus, para de usar cheat!", "Cheaters everywhere"] }, "Onial 1v1");
    expect(r.falas).toEqual(["O que acontece no Onial 1v1?", "Meu Deus, para de usar hacker!", "hacker everywhere"]);
  });
  it("sem mapa citado não mexe", () => {
    const r = aplicarTrocas({ titulo: "t", mapa_citado: "", mapa_trocado: false, falas: ["Olha isso"] }, "Onial 1v1");
    expect(r.falas).toEqual(["Olha isso"]); expect(r.mapa_trocado).toBe(false);
  });
});
