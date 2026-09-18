import { buildBuckets } from "./buckets";

const NOW = new Date("2026-09-17T13:45:30-03:00");

describe("buildBuckets", () => {
  it("cria 24 janelas para 24h", () => {
    expect(buildBuckets("24h", NOW)).toHaveLength(24);
  });

  it("cria 7 janelas para 7d", () => {
    expect(buildBuckets("7d", NOW)).toHaveLength(7);
  });

  it("cria 30 janelas para 30d", () => {
    expect(buildBuckets("30d", NOW)).toHaveLength(30);
  });

  it("alinha as janelas horárias no início da hora", () => {
    for (const bucket of buildBuckets("24h", NOW)) {
      expect(bucket.start.getMinutes()).toBe(0);
      expect(bucket.start.getSeconds()).toBe(0);
      expect(bucket.start.getMilliseconds()).toBe(0);
    }
  });

  it("alinha as janelas diárias na meia-noite local", () => {
    for (const bucket of buildBuckets("7d", NOW)) {
      expect(bucket.start.getHours()).toBe(0);
      expect(bucket.start.getMinutes()).toBe(0);
    }
  });

  it("não sobrepõe janelas adjacentes, porque o filtro da API é inclusivo nas duas pontas", () => {
    const buckets = buildBuckets("24h", NOW);
    for (let i = 0; i < buckets.length - 1; i++) {
      expect(buckets[i].end.getTime()).toBeLessThan(buckets[i + 1].start.getTime());
      expect(buckets[i + 1].start.getTime() - buckets[i].end.getTime()).toBe(1);
    }
  });

  it("não deixa buraco entre janelas diárias", () => {
    const buckets = buildBuckets("30d", NOW);
    for (let i = 0; i < buckets.length - 1; i++) {
      expect(buckets[i + 1].start.getTime() - buckets[i].end.getTime()).toBe(1);
    }
  });

  it("coloca o instante atual dentro da última janela", () => {
    for (const period of ["24h", "7d", "30d"] as const) {
      const last = buildBuckets(period, NOW).at(-1)!;
      expect(last.start.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(last.end.getTime()).toBeGreaterThanOrEqual(NOW.getTime());
    }
  });

  it("devolve as janelas em ordem cronológica", () => {
    const buckets = buildBuckets("7d", NOW);
    for (let i = 0; i < buckets.length - 1; i++) {
      expect(buckets[i].start.getTime()).toBeLessThan(buckets[i + 1].start.getTime());
    }
  });
});
