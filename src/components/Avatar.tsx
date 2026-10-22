"use client";
import { useState } from "react";
import { Icone } from "./Icone";

/** Foto do canal do criador; sem foto (ou se o link expirar), mostra o ícone de pessoa. */
export function Avatar({ foto, nome, tamanho = 32, borda }: { foto: string | null; nome: string; tamanho?: number; borda?: string }) {
  const [falhou, setFalhou] = useState(false);
  // fotos do YouTube vêm em 88px; pede uma maior para ficar nítida
  const src = foto?.replace(/=s\d+(-c)?/, "=s240$1") ?? null;
  const base = { width: tamanho, height: tamanho, flex: "none", borderRadius: "50%", border: borda ? `3px solid ${borda}` : undefined } as const;
  if (!src || falhou)
    return (
      <span className="flex items-center justify-center" style={{ ...base, background: "var(--tint)", color: "var(--accent-text)" }} aria-hidden="true">
        <Icone nome="user" tamanho={Math.round(tamanho * 0.45)} />
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`Foto de ${nome}`} referrerPolicy="no-referrer" onError={() => setFalhou(true)} style={{ ...base, objectFit: "cover", background: "var(--tint)" }} />;
}
