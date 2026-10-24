import { describe, expect, it } from "vitest";
import { ajudasConfirmadas, faixaHorario, podeAceitar, situacao, type Ajuda, type Pedido } from "./gravar";

const pedido = (x: Partial<Pedido> = {}): Pedido => ({ id: "p1", criador_id: "ana", dia: "2026-10-25", hora: "19:00:00", duracao_min: 45, vagas: 2, mapa: "1v1", descricao: "", status: "aberto", ...x });
const antes = new Date("2026-10-25T18:00:00-03:00");
const depois = new Date("2026-10-25T20:00:00-03:00");

describe("Gravações", () => {
  it("horário de início e fim", () => {
    expect(faixaHorario("19:00:00", 45)).toBe("19:00 às 19:45");
    expect(faixaHorario("23:30", 60)).toBe("23:30 às 00:30");
  });
  it("situação do pedido", () => {
    expect(situacao(pedido(), 0, antes)).toBe("aberto");
    expect(situacao(pedido(), 2, antes)).toBe("lotado");
    expect(situacao(pedido(), 1, depois)).toBe("confirmar");
    expect(situacao(pedido(), 0, depois)).toBe("passou");
    expect(situacao(pedido({ status: "feito" }), 1, depois)).toBe("feito");
  });
  it("quem pode aceitar", () => {
    const ajudas: Ajuda[] = [{ pedido_id: "p1", ajudante_id: "bia", presente: true }];
    expect(podeAceitar(pedido(), ajudas, "caio", antes)).toBe(true);
    expect(podeAceitar(pedido(), ajudas, "ana", antes)).toBe(false); // o próprio pedido
    expect(podeAceitar(pedido(), ajudas, "bia", antes)).toBe(false); // já aceitou
    expect(podeAceitar(pedido({ vagas: 1 }), ajudas, "caio", antes)).toBe(false); // lotado
    expect(podeAceitar(pedido(), ajudas, "caio", depois)).toBe(false); // já começou
  });
  it("bônus só para quem estava presente em gravação confirmada do mês", () => {
    const pedidos = [pedido({ status: "feito" }), pedido({ id: "p2", status: "aberto" }), pedido({ id: "p3", status: "feito", dia: "2026-11-02" })];
    const ajudas: Ajuda[] = [
      { pedido_id: "p1", ajudante_id: "bia", presente: true },
      { pedido_id: "p1", ajudante_id: "caio", presente: false },
      { pedido_id: "p2", ajudante_id: "bia", presente: true },
      { pedido_id: "p3", ajudante_id: "bia", presente: true },
    ];
    expect(ajudasConfirmadas(pedidos, ajudas, "bia", "2026-10")).toBe(1);
    expect(ajudasConfirmadas(pedidos, ajudas, "caio", "2026-10")).toBe(0);
  });
});
