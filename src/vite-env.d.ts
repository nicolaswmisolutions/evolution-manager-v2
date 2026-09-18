/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o modo demo (ver src/lib/demo/config.ts). Definida em build. */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
