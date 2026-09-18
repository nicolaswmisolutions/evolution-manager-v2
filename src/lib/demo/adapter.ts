import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { api, apiGlobal } from "@/lib/queries/api";

import { DEMO_LATENCY_MS, IS_DEMO } from "./config";
import { handleDemoRequest } from "./handlers";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extrai o caminho da requisição, tanto de URL absoluta quanto relativa a um baseURL. */
const resolvePath = (config: InternalAxiosRequestConfig): string => {
  const url = config.url ?? "/";
  const base = config.baseURL ?? window.location.origin;

  try {
    return new URL(url, base.endsWith("/") ? base : `${base}/`).pathname;
  } catch {
    return url.split("?")[0];
  }
};

const resolveParams = (config: InternalAxiosRequestConfig): Record<string, unknown> => {
  const params = config.params;
  if (!params) return {};
  if (params instanceof URLSearchParams) return Object.fromEntries(params.entries());
  return params as Record<string, unknown>;
};

const resolveBody = (config: InternalAxiosRequestConfig): unknown => {
  if (typeof config.data !== "string") return config.data;
  try {
    return JSON.parse(config.data);
  } catch {
    return config.data;
  }
};

/**
 * Adaptador axios do modo demo.
 *
 * Precisa ser instalado nas três formas como o manager fala com o backend: as
 * instâncias `api` e `apiGlobal`, e o `axios` padrão, usado pelo login e pela
 * licença. Instalar só em `axios.defaults` não bastaria — `axios.create()`
 * copia o adaptador dos defaults no momento da criação, e as duas instâncias
 * já existem quando isto roda.
 */
const demoAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  await sleep(DEMO_LATENCY_MS);

  const method = (config.method ?? "get").toLowerCase();
  const path = resolvePath(config);

  const { status, data } = handleDemoRequest({
    method,
    path,
    params: resolveParams(config),
    body: resolveBody(config),
  });

  const response: AxiosResponse = {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
  };

  if (status >= 400) {
    throw new AxiosError(`Modo demo: ${method.toUpperCase()} ${path} respondeu ${status}`, String(status), config, null, response);
  }

  return response;
};

export const installDemoAdapter = () => {
  if (!IS_DEMO) return;

  axios.defaults.adapter = demoAdapter;
  api.defaults.adapter = demoAdapter;
  apiGlobal.defaults.adapter = demoAdapter;

  console.info("[demo] Modo demo ligado: nenhuma requisição sai do navegador.");
};
