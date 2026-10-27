import { describe, expect, it } from "vitest";
import {
  calcularConstancia,
  calcularPagamento,
  formatarReais,
  inicioDaSemana,
  fimDaSemana,
  type DiaPostagem,
} from "./pagamento";

/** Outubro de 2026 com seg–sex agendados e todos postados. 1/10 é quinta. */
function outubroPerfeito(): DiaPostagem[] {
  const dias: DiaPostagem[] = [];
  for (let d = 1; d <= 31; d++) {
    const data = `2026-10-${String(d).padStart(2, "0")}`;
    const semana = new Date(Date.UTC(2026, 9, d)).getUTCDay();
    const agendado = semana >= 1 && semana <= 5;
    dias.push({ data, agendado, postagens: agendado ? 1 : 0 });
  }
  return dias;
}
function mudar(dias: DiaPostagem[], data: string, postagens: number) {
  return dias.map((d) => (d.data === data ? { ...d, postagens } : d));
}
const FIM_DO_MES = "2026-11-02"; // todas as semanas de outubro já encerradas

describe("semana", () => {
  it("segunda a domingo", () => {
    expect(inicioDaSemana("2026-10-21")).toBe("2026-10-19");
    expect(fimDaSemana("2026-10-21")).toBe("2026-10-25");
    expect(inicioDaSemana("2026-10-25")).toBe("2026-10-19");
  });
});

describe("constância", () => {
  it("mês perfeito: 0 faltas, 10%", () => {
    const r = calcularConstancia(outubroPerfeito(), FIM_DO_MES, "2026-10");
    expect(r).toEqual({ faltas: 0, aRepor: 0, percentual: 0.1 });
  });

  it("falta reposta na mesma semana (postou no sábado): continua 10%", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0); // quinta perdida
    dias = mudar(dias, "2026-10-10", 1); // sábado, dia de folga
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").percentual).toBe(0.1);
  });

  it("falta reposta com 2 vídeos no mesmo dia: continua 10%", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-13", 0);
    dias = mudar(dias, "2026-10-15", 2);
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").faltas).toBe(0);
  });

  it("reposição em outra semana não vale", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0);
    dias = mudar(dias, "2026-10-17", 1); // sábado da semana seguinte
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").faltas).toBe(1);
  });

  it("2º vídeo que é vídeo extra NÃO repõe a falta", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0); // quinta perdida
    dias = dias.map((d) => (d.data === "2026-10-09" ? { ...d, postagens: 2, extras: 1 } : d)); // sexta: 2 vídeos, 1 é extra
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").faltas).toBe(1);
  });

  it("2º vídeo normal repõe; o extra além dele não atrapalha", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0);
    dias = dias.map((d) => (d.data === "2026-10-09" ? { ...d, postagens: 3, extras: 1 } : d)); // 3 vídeos: 1 obrigatório + 1 extra + 1 que repõe
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").faltas).toBe(0);
  });

  it("vídeo extra na folga não repõe", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0);
    dias = dias.map((d) => (d.data === "2026-10-10" ? { ...d, postagens: 1, extras: 1 } : d)); // sábado (folga): só o extra
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").percentual).toBe(0.05);
  });

  it("1 falta: 5%", () => {
    const dias = mudar(outubroPerfeito(), "2026-10-08", 0);
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10")).toEqual({ faltas: 1, aRepor: 0, percentual: 0.05 });
  });

  it("2 faltas em semanas diferentes: 0%", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-08", 0);
    dias = mudar(dias, "2026-10-21", 0);
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10")).toEqual({ faltas: 2, aRepor: 0, percentual: 0 });
  });

  it("2 faltas na mesma semana, 1 reposta: 1 falta", () => {
    let dias = mudar(outubroPerfeito(), "2026-10-13", 0);
    dias = mudar(dias, "2026-10-14", 0);
    dias = mudar(dias, "2026-10-18", 1);
    expect(calcularConstancia(dias, FIM_DO_MES, "2026-10").faltas).toBe(1);
  });

  it("semana ainda aberta: dia perdido fica 'a repor', não é falta", () => {
    const dias = mudar(outubroPerfeito(), "2026-10-20", 0); // terça
    const r = calcularConstancia(dias, "2026-10-22", "2026-10"); // quinta da mesma semana
    expect(r.faltas).toBe(0);
    expect(r.aRepor).toBe(1);
  });

  it("hoje ainda não conta como perdido", () => {
    const dias = mudar(outubroPerfeito(), "2026-10-20", 0);
    expect(calcularConstancia(dias, "2026-10-20", "2026-10").aRepor).toBe(0);
  });
});

describe("pagamento", () => {
  it("exemplo do protótipo: 612.400 views, meta 700 mil não batida, 0 faltas", () => {
    const p = calcularPagamento(612_400, 700_000, 0);
    expect(p.brutoCentavos).toBe(306_200);
    expect(p.constanciaCentavos).toBe(30_620);
    expect(p.bateuMeta).toBe(false);
    expect(p.bonusMetaCentavos).toBe(0);
    expect(p.totalCentavos).toBe(336_820);
    expect(formatarReais(p.totalCentavos)).toBe("R$ 3.368,20");
  });

  it("meta batida: 734.900 views, meta 700 mil, 1 falta", () => {
    const p = calcularPagamento(734_900, 700_000, 1);
    expect(p.brutoCentavos).toBe(367_450);
    expect(p.constanciaCentavos).toBe(18_373); // 5%, arredondado
    expect(p.bateuMeta).toBe(true);
    expect(p.bonusMetaCentavos).toBe(70_000);
    expect(p.totalCentavos).toBe(367_450 + 18_373 + 70_000);
  });

  it("views exatamente na meta conta como batida", () => {
    expect(calcularPagamento(700_000, 700_000, 0).bonusMetaCentavos).toBe(70_000);
  });

  it("2 faltas: sem bônus de constância", () => {
    const p = calcularPagamento(500_000, null, 2);
    expect(p.constanciaCentavos).toBe(0);
    expect(p.totalCentavos).toBe(250_000);
  });

  it("sem meta definida: sem bônus de meta", () => {
    expect(calcularPagamento(900_000, null, 0).bonusMetaCentavos).toBe(0);
  });

  it("bônus de ajuda (Gravações): R$ 25 por gravação, somado ao total", () => {
    const semAjuda = calcularPagamento(612_400, 700_000, 0);
    const p = calcularPagamento(612_400, 700_000, 0, 3);
    expect(p.ajudas).toBe(3);
    expect(p.bonusAjudaCentavos).toBe(7_500);
    expect(p.totalCentavos).toBe(semAjuda.totalCentavos + 7_500);
    // não muda constância nem meta
    expect(p.constanciaCentavos).toBe(semAjuda.constanciaCentavos);
    expect(p.bonusMetaCentavos).toBe(0);
  });

  it("bônus de ajuda junto com meta batida e 2 faltas", () => {
    const p = calcularPagamento(734_900, 700_000, 2, 1);
    expect(p.totalCentavos).toBe(367_450 + 0 + 70_000 + 2_500);
  });

  it("sem ajudas (ou número inválido): bônus de ajuda zero", () => {
    expect(calcularPagamento(500_000, null, 0).bonusAjudaCentavos).toBe(0);
    expect(calcularPagamento(500_000, null, 0, -2).bonusAjudaCentavos).toBe(0);
  });

  it("vídeos extras aprovados: valor somado ao total, sem mudar constância e meta", () => {
    const base = calcularPagamento(612_400, 700_000, 0);
    const p = calcularPagamento(612_400, 700_000, 0, 0, 15_000);
    expect(p.bonusExtraCentavos).toBe(15_000);
    expect(p.totalCentavos).toBe(base.totalCentavos + 15_000);
    expect(p.constanciaCentavos).toBe(base.constanciaCentavos);
  });

  it("extras junto com ajuda, meta batida e 1 falta", () => {
    const p = calcularPagamento(734_900, 700_000, 1, 2, 10_000);
    expect(p.totalCentavos).toBe(367_450 + 18_373 + 70_000 + 5_000 + 10_000);
  });

  it("extras negativos não descontam", () => {
    expect(calcularPagamento(500_000, null, 2, 0, -500).bonusExtraCentavos).toBe(0);
  });

  it("formato brasileiro", () => {
    expect(formatarReais(306_200)).toBe("R$ 3.062,00");
  });
});
