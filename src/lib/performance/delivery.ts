import { DeliveryStatus } from "./types";

const RANK: Record<string, number> = {
  PENDING: 0,
  SERVER_ACK: 1,
  DELIVERY_ACK: 2,
  READ: 3,
};

/**
 * Resolve o estado de entrega de uma mensagem a partir das atualizações.
 *
 * A API devolve as atualizações sem ordem garantida, então escolhemos o estado
 * mais avançado em vez de confiar na posição. ERROR vence qualquer confirmação:
 * numa tela de diagnóstico, uma falha registrada importa mais do que um ack
 * anterior.
 */
export function resolveDeliveryStatus(updates?: Array<{ status: string }> | null): DeliveryStatus {
  if (!updates || updates.length === 0) return "PENDING";

  let best: DeliveryStatus = "PENDING";

  for (const update of updates) {
    if (update.status === "ERROR") return "ERROR";
    const rank = RANK[update.status];
    if (rank === undefined) continue;
    if (rank > RANK[best]) best = update.status as DeliveryStatus;
  }

  return best;
}
