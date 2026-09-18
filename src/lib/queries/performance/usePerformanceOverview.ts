import { useQuery } from "@tanstack/react-query";

import { findMessagesSource } from "@/lib/performance/findMessagesSource";
import { PerformanceOverview, PerformanceSource, Period } from "@/lib/performance/types";

/**
 * Único ponto de troca entre a fase 1 e a fase 2: basta apontar para o adapter
 * do endpoint agregado quando ele existir. A tela não muda.
 */
const source: PerformanceSource = findMessagesSource;

interface IParams {
  instanceName: string | null;
  token: string | null;
  period: Period;
  connectionStatus: string;
  lastDisconnectAt: string | null;
  lastDisconnectReason: number | null;
}

export const usePerformanceOverview = (params: IParams) => {
  const { instanceName, token, period } = params;

  return useQuery<PerformanceOverview>({
    queryKey: ["performance", "overview", instanceName, period],
    queryFn: () =>
      source.fetchOverview({
        instanceName: instanceName!,
        token: token!,
        period,
        connectionStatus: params.connectionStatus,
        lastDisconnectAt: params.lastDisconnectAt,
        lastDisconnectReason: params.lastDisconnectReason,
      }),
    enabled: !!instanceName && !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    // 57 a 69 requisições por carregamento; repetir tudo por uma falha isolada
    // sairia caro e a série já degrada graciosamente.
    retry: false,
  });
};
