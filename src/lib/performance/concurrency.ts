export type Settled<R> = { ok: true; value: R } | { ok: false; error: unknown };

/**
 * Executa `worker` sobre os itens com no máximo `limit` tarefas simultâneas.
 *
 * Devolve resultados settled, na ordem da entrada: a tela precisa renderizar a
 * série com as janelas que vieram, marcando as que falharam, em vez de
 * descartar o carregamento inteiro por causa de uma requisição.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Settled<R>[]> {
  const results: Settled<R>[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { ok: true, value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  });

  await Promise.all(runners);
  return results;
}
