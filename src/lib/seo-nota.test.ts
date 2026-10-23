import { describe, expect, it } from "vitest";
import { notaTitulo, palavras } from "./seo-nota";

describe("Nota do título", () => {
  it("palavras sem acento e sem palavras vazias", () => {
    expect(palavras("O MELHOR mapa de XP do Fortnite 🔥 #shorts")).toEqual(["melhor", "mapa", "xp"]);
  });
  it("título bom tira 100, ruim tira pouco, vazio tira 0", () => {
    expect(notaTitulo("O farm de XP mais rápido do Fortnite: 15 níveis 🔥").nota).toBe(100);
    expect(notaTitulo("OLHA ISSO 😱😱😱").nota).toBeLessThan(30);
    expect(notaTitulo("").nota).toBe(0);
  });
});
