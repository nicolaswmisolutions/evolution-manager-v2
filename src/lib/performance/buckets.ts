import { Period } from "./types";

export type Bucket = { start: Date; end: Date };

/**
 * Divide o período em janelas contíguas e sem sobreposição, terminando na
 * janela que contém `now`.
 *
 * Cada janela termina 1ms antes do início da seguinte: o filtro
 * `messageTimestamp` da API é inclusivo em `gte` e `lte`, então janelas que
 * compartilhassem a fronteira contariam a mesma mensagem duas vezes.
 *
 * A aritmética usa setHours/setDate em vez de somar milissegundos para que
 * mudanças de horário de verão não desalinhem as janelas.
 */
export function buildBuckets(period: Period, now: Date): Bucket[] {
  const buckets: Bucket[] = [];

  if (period === "24h") {
    for (let i = 23; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(start.getHours() - i, 0, 0, 0);

      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      end.setMilliseconds(-1);

      buckets.push({ start, end });
    }
    return buckets;
  }

  const days = period === "7d" ? 7 : 30;

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);

    buckets.push({ start, end });
  }

  return buckets;
}
