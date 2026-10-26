import { describe, expect, it } from "vitest";
import { textoPrazo } from "./prazo";

describe("prazo do extra", () => {
  it("vence no fim do dia escolhido", () => {
    expect(textoPrazo("2026-10-31", "2026-10-26")).toEqual({ texto: "Vence sábado, 31/10 às 23:59", faltam: "faltam 5 dias", urgente: false });
    expect(textoPrazo("2026-10-31", "2026-10-31").texto).toBe("Vence HOJE às 23:59");
    expect(textoPrazo("2026-10-31", "2026-10-30").urgente).toBe(true);
    expect(textoPrazo("2026-10-31", "2026-11-01").faltam).toBe("encerrado");
  });
});
