export type Period = "24h" | "7d" | "30d";

export type DeliveryStatus = "PENDING" | "SERVER_ACK" | "DELIVERY_ACK" | "READ" | "ERROR";

export type SeriesPoint = {
  /** ISO 8601, início da janela. */
  bucket: string;
  sent: number;
  received: number;
  /** true quando o count desta janela falhou e o ponto não é confiável. */
  partial?: boolean;
};

export type PerformanceOverview = {
  period: Period;
  generatedAt: string;
  series: SeriesPoint[];
  totals: { sent: number; received: number; total: number };
  messageTypes: Array<{ type: string; count: number }>;
  delivery: {
    counts: Record<DeliveryStatus, number>;
    /** true na fase 1: os números vêm de uma amostra, não do período inteiro. */
    sampled: boolean;
    sampleSize: number;
  };
  connection: {
    status: string;
    since: string | null;
    lastDisconnectAt: string | null;
    lastDisconnectReason: number | null;
    /** false na fase 1: a tabela Instance guarda só a última desconexão. */
    historyAvailable: boolean;
  };
  /**
   * Métricas que não puderam ser calculadas. Existe para que a tela declare a
   * ausência em vez de exibir zero — num diagnóstico, um zero ambíguo leva a
   * operação a investigar o problema errado.
   */
  degraded: Array<{ metric: string; reason: string }>;
  loadTimeMs: number;
};

export type FetchOverviewParams = {
  instanceName: string;
  token: string;
  period: Period;
  connectionStatus: string;
  lastDisconnectAt: string | null;
  lastDisconnectReason: number | null;
  now?: Date;
};

export interface PerformanceSource {
  fetchOverview(params: FetchOverviewParams): Promise<PerformanceOverview>;
}
