/**
 * PROTÓTIPO — tela de Performance com dados fictícios.
 *
 * Existe para validar layout e escolha de métricas antes de investir na
 * implementação real. Nenhuma chamada à API acontece aqui.
 */
import { Alert, AlertTitle } from "@evoapi/design-system/alert";
import { Button } from "@evoapi/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@evoapi/design-system/card";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BaseHeader } from "@/components/base-header";
import { InstanceStatus } from "@/components/instance-status";

import { useInstance } from "@/contexts/InstanceContext";

import { getMockOverview, Period } from "./mockData";

const PERIODS: { value: Period; label: string }[] = [
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const COLOR_SENT = "#189d68";
const COLOR_RECEIVED = "#3b82f6";

// Rampa ordinal: quanto mais avançado o estado, mais saturado. Falha usa a cor
// reservada de erro e nunca entra na rampa.
const DELIVERY_COLORS: Record<string, string> = {
  READ: "#189d68",
  DELIVERY_ACK: "#45b98a",
  SERVER_ACK: "#8ed4b5",
  PENDING: "#9ca3af",
  ERROR: "#dc2626",
};

function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Card className="border-sidebar-border bg-sidebar">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={tone === "danger" ? "text-3xl font-bold text-red-500" : "text-3xl font-bold"}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Performance() {
  const { instance } = useInstance();
  const [period, setPeriod] = useState<Period>("24h");

  const overview = useMemo(() => getMockOverview(period), [period]);
  const numberFormat = new Intl.NumberFormat("pt-BR");

  const deliveryTotal = overview.delivery.reduce((sum, item) => sum + item.count, 0);
  const errorCount = overview.delivery.find((item) => item.status === "ERROR")?.count ?? 0;
  const errorRate = deliveryTotal > 0 ? (errorCount / deliveryTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <BaseHeader title="Performance" subtitle={instance?.name ? `Diagnóstico de ${instance.name}` : "Diagnóstico da instância"} />

      <Alert variant="warning" className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <AlertTitle className="font-medium">
          Protótipo — todos os números desta tela são fictícios e não vêm da API
        </AlertTitle>
      </Alert>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={option.value === period ? "default" : "outline"}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total de mensagens"
          value={numberFormat.format(overview.totals.total)}
          icon={<MessageSquare size={16} />}
        />
        <StatTile
          label="Enviadas"
          value={numberFormat.format(overview.totals.sent)}
          hint={`${Math.round((overview.totals.sent / overview.totals.total) * 100)}% do volume`}
          icon={<ArrowUpRight size={16} />}
        />
        <StatTile
          label="Recebidas"
          value={numberFormat.format(overview.totals.received)}
          hint={`${Math.round((overview.totals.received / overview.totals.total) * 100)}% do volume`}
          icon={<ArrowDownLeft size={16} />}
        />
        <StatTile
          label="Taxa de falha"
          value={`${errorRate.toFixed(1)}%`}
          hint={`${errorCount} de ${deliveryTotal} na amostra`}
          icon={<AlertTriangle size={16} />}
          tone={errorRate >= 2 ? "danger" : undefined}
        />
      </section>

      <Card className="border-sidebar-border bg-sidebar">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Volume de mensagens</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/20" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} stroke="currentColor" className="text-muted-foreground" />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" width={48} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid rgba(127,127,127,.3)", background: "rgba(24,24,27,.95)", color: "#fff" }}
                formatter={(value: number, name: string) => [numberFormat.format(value), name]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="received"
                name="Recebidas"
                stackId="volume"
                stroke={COLOR_RECEIVED}
                strokeWidth={2}
                fill={COLOR_RECEIVED}
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="sent"
                name="Enviadas"
                stackId="volume"
                stroke={COLOR_SENT}
                strokeWidth={2}
                fill={COLOR_SENT}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-sidebar-border bg-sidebar">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Estado</span>
              <InstanceStatus status={overview.connection.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Conectada há</span>
              <span className="font-medium">{overview.connection.uptimeLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Última desconexão</span>
              <span>
                {overview.connection.lastDisconnectAt
                  ? new Date(overview.connection.lastDisconnectAt).toLocaleString("pt-BR")
                  : "Nenhuma registrada"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Código do motivo</span>
              <span className="font-mono">{overview.connection.lastDisconnectReason ?? "—"}</span>
            </div>
            <p className="border-t border-sidebar-border pt-3 text-xs text-muted-foreground">
              Histórico de quedas indisponível: a API guarda apenas a última desconexão.
            </p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-sidebar">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Entrega e leitura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.delivery.map((item) => {
              const percent = deliveryTotal > 0 ? (item.count / deliveryTotal) * 100 : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: DELIVERY_COLORS[item.status] }}
                      />
                      <span className={item.status === "ERROR" ? "font-medium text-red-500" : ""}>{item.label}</span>
                    </span>
                    <span className="font-medium">
                      {item.count}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{percent.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${percent}%`, background: DELIVERY_COLORS[item.status] }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="border-t border-sidebar-border pt-3 text-xs text-muted-foreground">
              Amostra das últimas {overview.sampleSize} mensagens enviadas — não é a taxa do período inteiro.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-sidebar-border bg-sidebar">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Tipos de mensagem</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.messageTypes} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-muted-foreground/20" />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip
                cursor={{ fill: "rgba(127,127,127,.12)" }}
                contentStyle={{ borderRadius: 8, border: "1px solid rgba(127,127,127,.3)", background: "rgba(24,24,27,.95)", color: "#fff" }}
                formatter={(value: number) => [numberFormat.format(value), "Mensagens"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {overview.messageTypes.map((entry) => (
                  <Cell key={entry.type} fill={COLOR_SENT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="text-right text-xs text-muted-foreground">
        Carregado em {numberFormat.format(overview.loadTimeMs)} ms (simulado — na implementação real este número é medido)
      </p>
    </div>
  );
}

export { Performance };
