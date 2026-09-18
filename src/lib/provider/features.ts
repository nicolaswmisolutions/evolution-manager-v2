import { IS_DEMO } from "@/lib/demo/config";
import { getProvider, Provider } from "@/lib/queries/token";

type ProviderSupport = Record<Provider, boolean>;

export const FEATURES = {
  dashboard: { api: true, go: true },
  // A tela de Performance ainda mostra dados fictícios, então só aparece em
  // modo demo. Liberar quando ela passar a ler do backend.
  performance: { api: IS_DEMO, go: false },
  chat: { api: true, go: false },
  settings: { api: true, go: true },
  proxy: { api: true, go: true },
  webhook: { api: true, go: true },
  websocket: { api: true, go: false },
  rabbitmq: { api: true, go: false },
  sqs: { api: true, go: false },
  evoai: { api: true, go: false },
  n8n: { api: true, go: false },
  evolutionBot: { api: true, go: false },
  chatwoot: { api: true, go: false },
  typebot: { api: true, go: false },
  openai: { api: true, go: false },
  dify: { api: true, go: false },
  flowise: { api: true, go: false },
} as const satisfies Record<string, ProviderSupport>;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey, provider?: Provider): boolean => {
  const p = provider ?? getProvider();
  return FEATURES[feature][p];
};
