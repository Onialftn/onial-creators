import { redirect } from "next/navigation";

/** A aba Roteiros foi unida à Ideias de vídeos (cada vídeo tem "Copiar roteiro em português"). */
export default function Pagina() {
  redirect("/ideias");
}
