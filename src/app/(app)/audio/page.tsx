import { AudioLimpeza } from "@/components/AudioLimpeza";
import { Cabecalho } from "@/components/Blocos";

export default function Audio() {
  return (
    <>
      <Cabecalho icone="wave" titulo="Limpar narração" sub="Envie a narração do vídeo e o site corta silêncios e respirações e deixa o volume no ponto. Tudo acontece no seu navegador." />
      <AudioLimpeza />
    </>
  );
}
