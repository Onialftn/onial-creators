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
      <Cabecalho icone="hash" titulo="SEO" sub="Passo a passo: título, descrição, hashtags, tags do YouTube e o melhor horário para postar." />
      <Seo pronta={iaConfigurada()} usados={usados} limite={perfil.papel === "gestor" ? null : LIMITE_MES.seo} />
    </>
  );
}
