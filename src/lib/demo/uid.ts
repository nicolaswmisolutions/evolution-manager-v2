/**
 * Identificador do modo demo.
 *
 * `crypto.randomUUID` só existe em contexto seguro, então abrir o manager por
 * IP da rede em http derrubaria o estado inteiro na criação do seed. O
 * fallback não precisa ser forte: são ids de dados fictícios.
 */
export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
