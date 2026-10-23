import { Cabecalho } from "@/components/Blocos";
import { Seo } from "@/components/Seo";
import { usuarioAtual } from "@/lib/dados";
import { iaConfigurada } from "@/lib/ia/claude";
import { LIMITE_MES, usadosNoMes } from "@/lib/ia/uso";

export default async function Pagina() {
  const { perfil } = await usuarioAtual();
  const usados = await usadosNoMes(perfil.id, "seo");
  return (
    <>
      <Cabecalho icone="hash" titulo="SEO" sub="Conte do que é o vídeo e a IA cria títulos, descrições e hashtags para YouTube, TikTok e Instagram." />
      <Seo pronta={iaConfigurada()} usados={usados} limite={perfil.papel === "gestor" ? null : LIMITE_MES.seo} />
    </>
  );
}
