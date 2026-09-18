import { api } from "@/lib/queries/api";

import { buildBuckets } from "./buckets";
import { mapWithConcurrency } from "./concurrency";
import { resolveDeliveryStatus } from "./delivery";
import { DeliveryStatus, FetchOverviewParams, PerformanceOverview, PerformanceSource, SeriesPoint } from "./types";

/**
 * A API não expõe os tipos de mensagem distintos, então a lista é uma escolha
 * do cliente: tipos fora dela não aparecem no gráfico.
 */
export const MESSAGE_TYPES = [
  "conversation",
  "extendedTextMessage",
  "imageMessage",
  "audioMessage",
  "videoMessage",
  "documentMessage",
  "stickerMessage",
  "reactionMessage",
];

export const DELIVERY_SAMPLE_SIZE = 200;

const CONCURRENCY = 6;

type CountFilters = {
  from: Date;
  to: Date;
  fromMe?: boolean;
  messageType?: string;
};

const buildWhere = ({ from, to, fromMe, messageType }: CountFilters) => ({
  messageTimestamp: { gte: from.toISOString(), lte: to.toISOString() },
  // O backend testa `fromMe` por truthiness, então enviar `false` não filtra
  // nada — medido. Só faz sentido enviar `true`.
  ...(fromMe ? { key: { fromMe: true } } : {}),
  ...(messageType ? { messageType } : {}),
});

const countMessages = async (instanceName: string, token: string, filters: CountFilters): Promise<number> => {
  // `offset: 1` traz um único registro: o que interessa é o `total`, não as
  // mensagens. Evita trafegar payload de mídia só para contar.
  const response = await api.post(
    `/chat/findMessages/${instanceName}`,
    { where: buildWhere(filters), offset: 1, page: 1 },
    { headers: { apikey: token } },
  );
  return response.data?.messages?.total ?? 0;
};

const emptyDeliveryCounts = (): Record<DeliveryStatus, number> => ({
  PENDING: 0,
  SERVER_ACK: 0,
  DELIVERY_ACK: 0,
  READ: 0,
  ERROR: 0,
});

const fetchDeliverySample = async (instanceName: string, token: string, from: Date, to: Date) => {
  const response = await api.post(
    `/chat/findMessages/${instanceName}`,
    { where: buildWhere({ from, to, fromMe: true }), offset: DELIVERY_SAMPLE_SIZE, page: 1 },
    { headers: { apikey: token } },
  );

  const records: Array<{ MessageUpdate?: Array<{ status: string }> }> = response.data?.messages?.records ?? [];
  const counts = emptyDeliveryCounts();

  for (const record of records) {
    counts[resolveDeliveryStatus(record.MessageUpdate)]++;
  }

  return { counts, sampleSize: records.length };
};

/**
 * Fonte da fase 1: monta o panorama a partir de contagens ao endpoint que já
 * existe, sem tocar no backend. É a única peça que a fase 2 substitui.
 */
export const findMessagesSource: PerformanceSource = {
  async fetchOverview(params: FetchOverviewParams): Promise<PerformanceOverview> {
    const { instanceName, token, period, now = new Date() } = params;
    const startedAt = Date.now();

    const buckets = buildBuckets(period, now);
    const windowStart = buckets[0].start;
    const windowEnd = buckets[buckets.length - 1].end;
    const degraded: PerformanceOverview["degraded"] = [];

    // Duas contagens por janela: total e enviadas. "Recebidas" sai por
    // subtração, porque o backend ignora o filtro `fromMe: false`.
    const jobs = buckets.flatMap((bucket) => [
      { bucket, fromMe: false },
      { bucket, fromMe: true },
    ]);

    const counts = await mapWithConcurrency(jobs, CONCURRENCY, (job) =>
      countMessages(instanceName, token, { from: job.bucket.start, to: job.bucket.end, fromMe: job.fromMe }),
    );

    const series: SeriesPoint[] = buckets.map((bucket, index) => {
      const totalResult = counts[index * 2];
      const sentResult = counts[index * 2 + 1];

      if (!totalResult.ok || !sentResult.ok) {
        return { bucket: bucket.start.toISOString(), sent: 0, received: 0, partial: true };
      }

      const sent = sentResult.value;
      const received = Math.max(totalResult.value - sent, 0);
      return { bucket: bucket.start.toISOString(), sent, received };
    });

    if (series.some((point) => point.partial)) {
      degraded.push({ metric: "series", reason: "partial" });
    }

    const totals = series.reduce(
      (acc, point) => ({
        sent: acc.sent + point.sent,
        received: acc.received + point.received,
        total: acc.total + point.sent + point.received,
      }),
      { sent: 0, received: 0, total: 0 },
    );

    const typeResults = await mapWithConcurrency(MESSAGE_TYPES, CONCURRENCY, (messageType) =>
      countMessages(instanceName, token, { from: windowStart, to: windowEnd, messageType }),
    );

    const messageTypes = MESSAGE_TYPES.map((type, index) => {
      const result = typeResults[index];
      return { type, count: result.ok ? result.value : 0 };
    }).filter((entry) => entry.count > 0);

    if (typeResults.some((result) => !result.ok)) {
      degraded.push({ metric: "messageTypes", reason: "partial" });
    }

    let delivery = { counts: emptyDeliveryCounts(), sampled: true, sampleSize: 0 };

    try {
      const sample = await fetchDeliverySample(instanceName, token, windowStart, windowEnd);
      delivery = { counts: sample.counts, sampled: true, sampleSize: sample.sampleSize };
    } catch {
      degraded.push({ metric: "delivery", reason: "failed" });
    }

    return {
      period,
      generatedAt: new Date().toISOString(),
      series,
      totals,
      messageTypes,
      delivery,
      connection: {
        status: params.connectionStatus,
        since: null,
        lastDisconnectAt: params.lastDisconnectAt,
        lastDisconnectReason: params.lastDisconnectReason,
        // A tabela Instance guarda apenas a última desconexão, não um histórico.
        historyAvailable: false,
      },
      degraded,
      loadTimeMs: Date.now() - startedAt,
    };
  },
};
