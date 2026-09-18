import { Instance, NewInstance, Settings, Webhook } from "@/types/evolution.types";

import { DEMO_CONNECT_DELAY_MS } from "./config";
import { findInstance, getState, mutate } from "./store";
import { uid } from "./uid";

export type DemoRequest = {
  method: string;
  path: string;
  params: Record<string, unknown>;
  body: unknown;
};

export type DemoResponse = { status: number; data: unknown };

type Handler = (request: DemoRequest, match: RegExpMatchArray) => DemoResponse;

type Route = { method: string; pattern: RegExp; handle: Handler };

const ok = (data: unknown): DemoResponse => ({ status: 200, data });

const notFound = (message: string): DemoResponse => ({
  status: 404,
  // Mesmo envelope de erro da Evolution API, que a UI lê em
  // `error.response.data.response.message`.
  data: { status: 404, error: "Not Found", response: { message } },
});

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

const emptyWebhook = (): Webhook => ({
  id: uid(),
  enabled: false,
  url: "",
  events: [],
  base64: false,
  byEvents: false,
  headers: {},
});

/** Formato que o `fetchWebhook` do manager espera (base64/byEvents com prefixo). */
const toFetchWebhookResponse = (webhook: Webhook) => ({
  id: webhook.id,
  enabled: webhook.enabled,
  url: webhook.url,
  events: webhook.events,
  headers: webhook.headers ?? {},
  webhookBase64: webhook.base64,
  webhookByEvents: webhook.byEvents,
});

/**
 * String arbitrária para o componente de QR desenhar. Não é um QR válido do
 * WhatsApp — nada aqui fala com o WhatsApp.
 */
const fakeQrPayload = (instanceName: string) => `2@demo/${instanceName}/${uid()}`;

const fakePairingCode = () => Math.random().toString(36).replace(/[^a-z0-9]/g, "").toUpperCase().padEnd(8, "0").slice(0, 8);

const routes: Route[] = [
  // --- Login -------------------------------------------------------------
  {
    method: "get",
    pattern: /^\/$/,
    handle: () =>
      ok({
        status: 200,
        message: "Welcome to the Evolution API (modo demo), it is working!",
        version: "2.3.7-demo",
        clientName: "evolution_demo",
        manager: "/manager",
        documentation: "https://doc.evolution-api.com",
      }),
  },
  {
    method: "post",
    pattern: /^\/verify-creds$/,
    handle: () => ok({ facebookAppId: "", facebookConfigId: "", facebookUserToken: "" }),
  },
  {
    // O backend deste fork não tem o módulo de licença. Responder 404 reproduz
    // isso: o login cai no try/catch e segue o fluxo normal.
    method: "get",
    pattern: /^\/license\/status$/,
    handle: () => notFound("License module not available"),
  },

  // --- Instâncias --------------------------------------------------------
  {
    method: "get",
    pattern: /^\/instance\/fetchInstances$/,
    handle: (request) => {
      const { instances } = getState();
      const instanceId = request.params.instanceId;

      if (typeof instanceId === "string" && instanceId) {
        return ok(instances.filter((item) => item.id === instanceId || item.name === instanceId));
      }

      return ok(instances);
    },
  },
  {
    method: "post",
    pattern: /^\/instance\/create$/,
    handle: (request) => {
      const body = (request.body ?? {}) as NewInstance;
      const name = body.instanceName?.trim();

      if (!name) return notFound("instanceName is required");
      if (findInstance(name)) {
        return { status: 403, data: { status: 403, error: "Forbidden", response: { message: `Instance "${name}" already in use` } } };
      }

      const instance: Instance = {
        id: uid(),
        name,
        // Nasce aguardando a leitura do QR, como no fluxo real.
        connectionStatus: "connecting",
        ownerJid: body.number ? `${body.number}@s.whatsapp.net` : "",
        profileName: "",
        profilePicUrl: "",
        integration: body.integration || "WHATSAPP-BAILEYS",
        number: body.number ?? "",
        businessId: body.businessId ?? "",
        token: body.token || `demo-token-${name}`,
        clientName: "evolution_demo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        Setting: defaultSettings(),
        _count: { Message: 0, Contact: 0, Chat: 0 },
      };

      return mutate((state) => {
        state.instances.push(instance);
        state.webhooks[name] = emptyWebhook();
        return ok({ instance, hash: instance.token, qrcode: { code: fakeQrPayload(name), base64: "" } });
      });
    },
  },
  {
    method: "get",
    pattern: /^\/instance\/connect\/([^/]+)$/,
    handle: (request, match) => {
      const name = decodeURIComponent(match[1]);
      const instance = findInstance(name);
      if (!instance) return notFound(`Instance "${name}" not found`);

      return mutate((state) => {
        const target = state.instances.find((item) => item.name === instance.name)!;
        target.connectionStatus = "connecting";

        // Marca quando a instância deve aparecer conectada. O store aplica o
        // prazo na próxima leitura, então basta a UI refazer o fetch.
        state.connectsAt[target.name] = Date.now() + DEMO_CONNECT_DELAY_MS;

        const number = request.params.number;
        if (typeof number === "string" && number) {
          target.number = number;
          target.ownerJid = `${number}@s.whatsapp.net`;
        }
        if (!target.profileName) {
          target.profileName = target.name;
        }

        return ok({ code: fakeQrPayload(target.name), pairingCode: fakePairingCode(), count: 1 });
      });
    },
  },
  {
    method: "post",
    pattern: /^\/instance\/restart\/([^/]+)$/,
    handle: (_request, match) => {
      const name = decodeURIComponent(match[1]);
      const instance = findInstance(name);
      if (!instance) return notFound(`Instance "${name}" not found`);
      return ok({ instance: { instanceName: name, state: instance.connectionStatus } });
    },
  },
  {
    method: "delete",
    pattern: /^\/instance\/logout\/([^/]+)$/,
    handle: (_request, match) => {
      const name = decodeURIComponent(match[1]);
      return mutate((state) => {
        const target = state.instances.find((item) => item.name === name);
        if (!target) return notFound(`Instance "${name}" not found`);

        target.connectionStatus = "close";
        target.updatedAt = new Date().toISOString();
        delete state.connectsAt[name];
        return ok({ status: "SUCCESS", error: false, response: { message: "Instance logged out" } });
      });
    },
  },
  {
    method: "delete",
    pattern: /^\/instance\/delete\/([^/]+)$/,
    handle: (_request, match) => {
      const name = decodeURIComponent(match[1]);
      return mutate((state) => {
        const index = state.instances.findIndex((item) => item.name === name);
        if (index < 0) return notFound(`Instance "${name}" not found`);

        state.instances.splice(index, 1);
        delete state.webhooks[name];
        delete state.connectsAt[name];
        return ok({ status: "SUCCESS", error: false, response: { message: "Instance deleted" } });
      });
    },
  },

  // --- Settings ----------------------------------------------------------
  {
    method: "get",
    pattern: /^\/settings\/find\/([^/]+)$/,
    handle: (_request, match) => {
      const instance = findInstance(decodeURIComponent(match[1]));
      if (!instance) return notFound("Instance not found");
      return ok(instance.Setting);
    },
  },
  {
    method: "post",
    pattern: /^\/settings\/set\/([^/]+)$/,
    handle: (request, match) => {
      const name = decodeURIComponent(match[1]);
      return mutate((state) => {
        const target = state.instances.find((item) => item.name === name);
        if (!target) return notFound("Instance not found");

        target.Setting = { ...target.Setting, ...(request.body as Settings) };
        return ok({ settings: target.Setting });
      });
    },
  },

  // --- Webhook -----------------------------------------------------------
  {
    method: "get",
    pattern: /^\/webhook\/find\/([^/]+)$/,
    handle: (_request, match) => {
      const name = decodeURIComponent(match[1]);
      const webhook = getState().webhooks[name];
      if (!webhook) return notFound("Webhook not found");
      return ok(toFetchWebhookResponse(webhook));
    },
  },
  {
    method: "post",
    pattern: /^\/webhook\/set\/([^/]+)$/,
    handle: (request, match) => {
      const name = decodeURIComponent(match[1]);
      const payload = (request.body as { webhook?: Webhook })?.webhook;
      if (!payload) return notFound("webhook payload is required");

      return mutate((state) => {
        const saved: Webhook = {
          ...emptyWebhook(),
          ...state.webhooks[name],
          ...payload,
          headers: payload.headers ?? {},
        };
        state.webhooks[name] = saved;
        return ok({ webhook: toFetchWebhookResponse(saved) });
      });
    },
  },
];

export const handleDemoRequest = (request: DemoRequest): DemoResponse => {
  for (const route of routes) {
    if (route.method !== request.method) continue;
    const match = request.path.match(route.pattern);
    if (match) return route.handle(request, match);
  }

  // Rota não simulada: falha alto, para que fique claro que é limite do modo
  // demo e não um bug da tela.
  return {
    status: 501,
    data: {
      status: 501,
      error: "Not Implemented",
      response: { message: `Modo demo: ${request.method.toUpperCase()} ${request.path} não é simulado` },
    },
  };
};
