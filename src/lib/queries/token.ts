/* eslint-disable no-unused-vars */
export type Provider = "api" | "go";

export const DEFAULT_PROVIDER: Provider = "api";

export enum TOKEN_ID {
  API_URL = "apiUrl",
  TOKEN = "token",
  INSTANCE_ID = "instanceId",
  INSTANCE_NAME = "instanceName",
  INSTANCE_TOKEN = "instanceToken",
  VERSION = "version",
  FACEBOOK_APP_ID = "facebookAppId",
  FACEBOOK_CONFIG_ID = "facebookConfigId",
  FACEBOOK_USER_TOKEN = "facebookUserToken",
  CLIENT_NAME = "clientName",
  PROVIDER = "provider",
  /**
   * Último servidor usado com sucesso. Diferente de API_URL: sobrevive ao
   * logout, para que o painel não esqueça onde fica a Evolution a cada saída.
   */
  LAST_API_URL = "lastApiUrl",
}

interface SaveCredentialsParams {
  url?: string;
  token?: string;
  version?: string;
  facebookAppId?: string;
  facebookConfigId?: string;
  facebookUserToken?: string;
  clientName?: string;
  provider?: Provider;
}

export const saveToken = async (params: SaveCredentialsParams) => {
  if (params.url) {
    const urlFormatted = params.url.endsWith("/") ? params.url.slice(0, -1) : params.url;
    localStorage.setItem(TOKEN_ID.API_URL, urlFormatted);
    localStorage.setItem(TOKEN_ID.LAST_API_URL, urlFormatted);
  }

  if (params.token) localStorage.setItem(TOKEN_ID.TOKEN, params.token);
  if (params.version) localStorage.setItem(TOKEN_ID.VERSION, params.version);
  if (params.facebookAppId) localStorage.setItem(TOKEN_ID.FACEBOOK_APP_ID, params.facebookAppId);
  if (params.facebookConfigId) localStorage.setItem(TOKEN_ID.FACEBOOK_CONFIG_ID, params.facebookConfigId);
  if (params.facebookUserToken) localStorage.setItem(TOKEN_ID.FACEBOOK_USER_TOKEN, params.facebookUserToken);
  if (params.clientName) localStorage.setItem(TOKEN_ID.CLIENT_NAME, params.clientName);
  if (params.provider) localStorage.setItem(TOKEN_ID.PROVIDER, params.provider);
};

/** Não apaga LAST_API_URL: sair não deveria custar redigitar o endereço do servidor. */
export const logout = () => {
  localStorage.removeItem(TOKEN_ID.API_URL);
  localStorage.removeItem(TOKEN_ID.TOKEN);
  localStorage.removeItem(TOKEN_ID.VERSION);
  localStorage.removeItem(TOKEN_ID.FACEBOOK_APP_ID);
  localStorage.removeItem(TOKEN_ID.FACEBOOK_CONFIG_ID);
  localStorage.removeItem(TOKEN_ID.FACEBOOK_USER_TOKEN);
  localStorage.removeItem(TOKEN_ID.CLIENT_NAME);
  localStorage.removeItem(TOKEN_ID.PROVIDER);
};

export const getToken = (token: TOKEN_ID) => {
  return localStorage.getItem(token);
};

export const getProvider = (): Provider => {
  const value = localStorage.getItem(TOKEN_ID.PROVIDER);
  return value === "go" ? "go" : DEFAULT_PROVIDER;
};

/**
 * Endereço sugerido no formulário de login.
 *
 * O padrão anterior era `window.location.origin`, que só está certo quando a
 * própria API serve o manager. Num painel apontando para uma Evolution remota
 * ele está sempre errado, e o sintoma é ruim: o servidor responde o HTML do
 * próprio painel, o login não acha `version` e acusa "servidor inválido".
 *
 * Ordem: o último servidor que funcionou, depois um padrão de build, e só
 * então a origem — que continua correta no caso em que a API serve o manager.
 */
export const getDefaultServerUrl = (): string => {
  const remembered = localStorage.getItem(TOKEN_ID.LAST_API_URL);
  if (remembered) return remembered;

  const fromBuild = import.meta.env.VITE_DEFAULT_SERVER_URL;
  if (fromBuild) return fromBuild.replace(/\/+$/, "");

  return window.location.origin;
};
