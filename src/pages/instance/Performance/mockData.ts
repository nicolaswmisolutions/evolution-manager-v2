/**
 * PROTÓTIPO — dados fictícios para validar layout e escolha de métricas.
 * Nada aqui consulta a API. Substituído pelo PerformanceSource real depois.
 */

export type Period = "24h" | "7d" | "30d";

export type SeriesPoint = { label: string; sent: number; received: number };

export type MockOverview = {
  series: SeriesPoint[];
  totals: { sent: number; received: number; total: number };
  delivery: { status: string; label: string; count: number }[];
  sampleSize: number;
  messageTypes: { type: string; label: string; count: number }[];
  connection: {
    status: string;
    uptimeLabel: string;
    lastDisconnectAt: string | null;
    lastDisconnectReason: number | null;
  };
  loadTimeMs: number;
};

const hourLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}h`);

const dayLabels = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(2026, 8, 17 - (count - 1 - i));
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

// Curva de expediente comercial: quase nada de madrugada, pico entre 9h e 18h.
const BUSINESS_CURVE = [
  2, 1, 0, 0, 1, 3, 12, 38, 74, 126, 158, 171, 149, 112, 163, 184, 176, 141, 96, 58, 34, 19, 9, 4,
];

const series24h: SeriesPoint[] = hourLabels.map((label, i) => {
  const total = BUSINESS_CURVE[i];
  const sent = Math.round(total * 0.42);
  return { label, sent, received: total - sent };
});

const buildDaily = (count: number, base: number): SeriesPoint[] =>
  dayLabels(count).map((label, i) => {
    // Variação pseudo-aleatória determinística, com queda nos fins de semana.
    const weekday = new Date(2026, 8, 17 - (count - 1 - i)).getDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.28 : 1;
    const wobble = 0.75 + ((i * 37) % 50) / 100;
    const total = Math.round(base * weekendFactor * wobble);
    const sent = Math.round(total * 0.42);
    return { label, sent, received: total - sent };
  });

const SERIES: Record<Period, SeriesPoint[]> = {
  "24h": series24h,
  "7d": buildDaily(7, 1480),
  "30d": buildDaily(30, 1480),
};

const DELIVERY: Record<Period, { status: string; label: string; count: number }[]> = {
  "24h": [
    { status: "READ", label: "Lida", count: 121 },
    { status: "DELIVERY_ACK", label: "Entregue", count: 54 },
    { status: "SERVER_ACK", label: "No servidor", count: 15 },
    { status: "PENDING", label: "Pendente", count: 6 },
    { status: "ERROR", label: "Falha", count: 4 },
  ],
  "7d": [
    { status: "READ", label: "Lida", count: 108 },
    { status: "DELIVERY_ACK", label: "Entregue", count: 61 },
    { status: "SERVER_ACK", label: "No servidor", count: 18 },
    { status: "PENDING", label: "Pendente", count: 9 },
    { status: "ERROR", label: "Falha", count: 4 },
  ],
  "30d": [
    { status: "READ", label: "Lida", count: 99 },
    { status: "DELIVERY_ACK", label: "Entregue", count: 64 },
    { status: "SERVER_ACK", label: "No servidor", count: 21 },
    { status: "PENDING", label: "Pendente", count: 5 },
    { status: "ERROR", label: "Falha", count: 11 },
  ],
};

const TYPES: Record<Period, { type: string; label: string; count: number }[]> = {
  "24h": [
    { type: "conversation", label: "Texto", count: 921 },
    { type: "extendedTextMessage", label: "Texto c/ citação", count: 312 },
    { type: "imageMessage", label: "Imagem", count: 184 },
    { type: "audioMessage", label: "Áudio", count: 143 },
    { type: "documentMessage", label: "Documento", count: 61 },
    { type: "videoMessage", label: "Vídeo", count: 28 },
    { type: "stickerMessage", label: "Figurinha", count: 17 },
    { type: "reactionMessage", label: "Reação", count: 12 },
  ],
  "7d": [
    { type: "conversation", label: "Texto", count: 5840 },
    { type: "extendedTextMessage", label: "Texto c/ citação", count: 1972 },
    { type: "imageMessage", label: "Imagem", count: 1043 },
    { type: "audioMessage", label: "Áudio", count: 887 },
    { type: "documentMessage", label: "Documento", count: 402 },
    { type: "videoMessage", label: "Vídeo", count: 171 },
    { type: "stickerMessage", label: "Figurinha", count: 96 },
    { type: "reactionMessage", label: "Reação", count: 74 },
  ],
  "30d": [
    { type: "conversation", label: "Texto", count: 23110 },
    { type: "extendedTextMessage", label: "Texto c/ citação", count: 7644 },
    { type: "imageMessage", label: "Imagem", count: 4128 },
    { type: "audioMessage", label: "Áudio", count: 3510 },
    { type: "documentMessage", label: "Documento", count: 1602 },
    { type: "videoMessage", label: "Vídeo", count: 688 },
    { type: "stickerMessage", label: "Figurinha", count: 371 },
    { type: "reactionMessage", label: "Reação", count: 290 },
  ],
};

const LOAD_TIME: Record<Period, number> = { "24h": 4180, "7d": 2260, "30d": 7940 };

export function getMockOverview(period: Period): MockOverview {
  const series = SERIES[period];

  const totals = series.reduce(
    (acc, point) => ({
      sent: acc.sent + point.sent,
      received: acc.received + point.received,
      total: acc.total + point.sent + point.received,
    }),
    { sent: 0, received: 0, total: 0 },
  );

  return {
    series,
    totals,
    delivery: DELIVERY[period],
    sampleSize: 200,
    messageTypes: TYPES[period],
    connection: {
      status: "open",
      uptimeLabel: "3 d 7 h",
      lastDisconnectAt: "2026-09-14T06:12:00-03:00",
      lastDisconnectReason: 428,
    },
    loadTimeMs: LOAD_TIME[period],
  };
}
