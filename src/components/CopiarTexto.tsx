"use client";
import { useState } from "react";

/** Botãozinho que copia um texto (ex.: chave Pix) e fica verde por 2 segundos. */
export function CopiarTexto({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão */ }
  }
  return (
    <button type="button" onClick={copiar} style={{ minHeight: 30, padding: "0 10px", borderRadius: 15, fontSize: 12, fontWeight: 600, border: `1px solid ${ok ? "#3DDC97" : "var(--line2)"}`, background: ok ? "#3DDC97" : "transparent", color: ok ? "#0A0A0A" : "var(--fg)" }}>
      {ok ? "Copiado!" : rotulo}
    </button>
  );
}
