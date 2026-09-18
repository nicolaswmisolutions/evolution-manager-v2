/**
 * Conversão entre o objeto de headers que a API guarda e o texto JSON que o
 * formulário edita.
 *
 * Lógica pura, sem React nem axios, para poder ser testada isoladamente
 * quando o vitest entrar no projeto.
 */

export type ParseResult = { ok: true; headers: Record<string, string> } | { ok: false; error: string };

/** Serializa os headers para edição. Ausência de headers vira um objeto vazio, não texto vazio. */
export const headersToJson = (headers?: Record<string, string> | null): string => JSON.stringify(headers ?? {}, null, 2);

/**
 * Lê o texto do formulário.
 *
 * Só aceita um objeto plano de valores escalares, que é o que a API consegue
 * mandar como cabeçalho HTTP. Números e booleanos são convertidos para texto;
 * objetos e listas aninhadas são recusados, porque virariam "[object Object]"
 * na requisição sem ninguém perceber.
 */
export const parseHeadersJson = (text: string): ParseResult => {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, headers: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "JSON inválido" };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Use um objeto JSON, por exemplo { \"Authorization\": \"Bearer ...\" }" };
  }

  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const name = key.trim();
    if (!name) return { ok: false, error: "Há um header sem nome" };

    if (typeof value === "string") {
      headers[name] = value;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      headers[name] = String(value);
      continue;
    }

    return { ok: false, error: `O header "${name}" precisa ter um valor simples (texto, número ou booleano)` };
  }

  return { ok: true, headers };
};
