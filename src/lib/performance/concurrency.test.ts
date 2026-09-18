import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("preserva a ordem dos resultados", async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(result).toEqual([
      { ok: true, value: 10 },
      { ok: true, value: 20 },
      { ok: true, value: 30 },
      { ok: true, value: 40 },
    ]);
  });

  it("nunca ultrapassa o limite de tarefas simultâneas", async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      3,
      async (n) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 1));
        running--;
        return n;
      },
    );

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("captura a falha de um item sem derrubar os demais", async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });

    expect(result[0]).toEqual({ ok: true, value: 1 });
    expect(result[1].ok).toBe(false);
    expect(result[2]).toEqual({ ok: true, value: 3 });
  });

  it("devolve lista vazia para entrada vazia", async () => {
    expect(await mapWithConcurrency([], 4, async (n) => n)).toEqual([]);
  });

  it("passa o índice para o worker", async () => {
    const result = await mapWithConcurrency(["a", "b"], 1, async (item, index) => `${index}:${item}`);
    expect(result).toEqual([
      { ok: true, value: "0:a" },
      { ok: true, value: "1:b" },
    ]);
  });
});
