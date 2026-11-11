"use client";

import { useFormStatus } from "react-dom";
import { Icone } from "./Icone";

/** Botão "Coletar views agora" do painel do gestor: mostra que está coletando (leva 1 a 3 minutos). */
export function BotaoColetar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-line" type="submit" disabled={pending} aria-busy={pending} style={pending ? { cursor: "wait", opacity: 0.8 } : undefined}>
      <span className={pending ? "girando" : undefined} style={{ display: "flex" }}><Icone nome="reset" tamanho={16} /></span>
      {pending ? "Coletando… (1 a 3 minutos, não feche)" : "Coletar views agora"}
    </button>
  );
}
