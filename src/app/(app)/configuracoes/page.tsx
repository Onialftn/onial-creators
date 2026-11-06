import { Cabecalho } from "@/components/Blocos";
import { Configuracoes } from "@/components/Configuracoes";

export default function PaginaConfiguracoes() {
  return (
    <>
      <Cabecalho icone="gear" titulo="Configurações" sub="Deixe o site do seu jeito: cor, modo claro ou escuro, tamanho do texto e animações." />
      <Configuracoes />
    </>
  );
}
