/**
 * Modo demo: o manager roda inteiro sem backend, com um adaptador axios que
 * responde às rotas da Evolution API a partir de um estado em memória.
 *
 * Existe para validar telas antes do backend, e é ligado por **variável de
 * build**, nunca por runtime: um build normal não tem como cair em modo demo
 * por engano, porque a constante some do bundle.
 *
 * Para remover o modo demo, apague `src/lib/demo/`, a chamada em `main.tsx` e
 * os usos de `IS_DEMO`.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

/** Atraso artificial das respostas, para que a UI exercite seus estados de carregamento. */
export const DEMO_LATENCY_MS = 140;

/** Quanto tempo o QR fica "aguardando leitura" antes de a instância virar `open`. */
export const DEMO_CONNECT_DELAY_MS = 6000;
