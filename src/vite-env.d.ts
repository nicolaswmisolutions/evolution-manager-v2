/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o modo demo (ver src/lib/demo/config.ts). Definida em build. */
  readonly VITE_DEMO_MODE?: string;
  /** Servidor sugerido no login quando não há um anterior lembrado. */
  readonly VITE_DEFAULT_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
