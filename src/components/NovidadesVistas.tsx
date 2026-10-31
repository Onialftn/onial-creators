"use client";
import { useEffect } from "react";

/** Ao abrir a aba Novidades, zera o número do menu (guarda a hora neste aparelho). */
export function NovidadesVistas() {
  useEffect(() => {
    try { localStorage.setItem("onialNovidadesVistas", String(Date.now())); } catch { /* sem armazenamento */ }
    window.dispatchEvent(new Event("novidades-vistas"));
  }, []);
  return null;
}
