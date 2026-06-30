/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RIFT_API_KEY?: string;
  readonly VITE_WIDGET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
