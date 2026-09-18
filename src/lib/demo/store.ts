import { Instance, Settings, Webhook } from "@/types/evolution.types";

import { uid } from "./uid";

/**
 * Estado do modo demo.
 *
 * Fica em `localStorage` para sobreviver a um F5: uma instância que você
 * conectou continua conectada, e os headers que você salvou continuam salvos.
 * É por navegador — não há servidor guardando nada.
 */
const STORAGE_KEY = "evolution-demo-state";

export type DemoState = {
  instances: Instance[];
  /** Webhook por nome de instância. Cada instância tem os seus headers. */
  webhooks: Record<string, Webhook>;
  /**
   * Instante (epoch ms) em que cada instância em conexão passa a `open`,
   * simulando o tempo entre exibir o QR e o celular pareá-lo.
   */
  connectsAt: Record<string, number>;
};

const defaultSettings = (): Settings => ({
  id: uid(),
  rejectCall: false,
  msgCall: "",
  groupsIgnore: false,
  alwaysOnline: false,
  readMessages: false,
  readStatus: false,
  syncFullHistory: false,
});

type SeedInstanceParams = {
  name: string;
  number: string;
  profileName: string;
  messages: number;
  contacts: number;
  chats: number;
};

const seedInstance = ({ name, number, profileName, messages, contacts, chats }: SeedInstanceParams): Instance => ({
  id: uid(),
  name,
  connectionStatus: "open",
  ownerJid: `${number}@s.whatsapp.net`,
  profileName,
  profilePicUrl: "",
  integration: "WHATSAPP-BAILEYS",
  number,
  businessId: "",
  token: `demo-token-${name}`,
  clientName: "evolution_demo",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  Setting: defaultSettings(),
  _count: { Message: messages, Contact: contacts, Chat: chats },
});

/**
 * Duas instâncias com headers de webhook diferentes, para que a diferença
 * entre elas seja visível já no primeiro acesso.
 */
const buildSeed = (): DemoState => {
  const suporte = seedInstance({
    name: "suporte-wmi",
    number: "554130001001",
    profileName: "Suporte WMI",
    messages: 18432,
    contacts: 1247,
    chats: 863,
  });

  const comercial = seedInstance({
    name: "comercial-wmi",
    number: "554130001002",
    profileName: "Comercial WMI",
    messages: 6210,
    contacts: 512,
    chats: 344,
  });

  return {
    instances: [suporte, comercial],
    webhooks: {
      [suporte.name]: {
        id: uid(),
        enabled: true,
        url: "https://n8n.wmi.solutions/webhook/suporte",
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        base64: false,
        byEvents: false,
        headers: {
          Authorization: "Bearer demo-suporte-9f21",
          "X-WMI-Tenant": "suporte",
        },
      },
      [comercial.name]: {
        id: uid(),
        enabled: true,
        url: "https://n8n.wmi.solutions/webhook/comercial",
        events: ["MESSAGES_UPSERT", "SEND_MESSAGE"],
        base64: false,
        byEvents: true,
        headers: {
          "X-WMI-Tenant": "comercial",
          "X-Origem": "evolution-manager",
        },
      },
    },
    connectsAt: {},
  };
};

let state: DemoState | null = null;

const read = (): DemoState => {
  if (state) return state;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state = JSON.parse(stored) as DemoState;
      return state;
    }
  } catch {
    // Estado corrompido é descartado: é dado de demonstração, não vale recuperar.
  }

  state = buildSeed();
  persist();
  return state;
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem localStorage o modo demo ainda funciona, só não sobrevive ao reload.
  }
};

/**
 * Aplica o tempo decorrido: instâncias cujo prazo de conexão venceu passam a
 * `open`. Roda a cada leitura, então a UI converge sozinha no próximo refetch.
 */
const settleConnections = (current: DemoState) => {
  const now = Date.now();
  let changed = false;

  for (const [name, at] of Object.entries(current.connectsAt)) {
    if (now < at) continue;

    const instance = current.instances.find((item) => item.name === name);
    if (instance) {
      instance.connectionStatus = "open";
      instance.updatedAt = new Date().toISOString();
    }
    delete current.connectsAt[name];
    changed = true;
  }

  if (changed) persist();
};

export const getState = (): DemoState => {
  const current = read();
  settleConnections(current);
  return current;
};

export const mutate = <T>(change: (current: DemoState) => T): T => {
  const current = getState();
  const result = change(current);
  persist();
  return result;
};

export const findInstance = (nameOrId: string): Instance | undefined =>
  getState().instances.find((item) => item.name === nameOrId || item.id === nameOrId);

export const resetDemoState = () => {
  state = buildSeed();
  persist();
};
