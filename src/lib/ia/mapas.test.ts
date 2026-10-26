import { describe, expect, it } from "vitest";
import { mapasDasOpcoes } from "./mapas";

describe("opções do dia", () => {
  it("dia de treino: treino, 1v1, treino", () => expect(mapasDasOpcoes("aim")).toEqual(["aim", "1v1", "aim"]));
  it("dia de 1v1: 1v1, treino, 1v1", () => expect(mapasDasOpcoes("1v1")).toEqual(["1v1", "aim", "1v1"]));
});
