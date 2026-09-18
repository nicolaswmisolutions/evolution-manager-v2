import { Alert, AlertTitle } from "@evoapi/design-system/alert";
import { Button } from "@evoapi/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@evoapi/design-system/card";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { BaseHeader } from "@/components/base-header";
import { InstanceStatus } from "@/components/instance-status";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import { useInstance } from "@/contexts/InstanceContext";

import { DELIVERY_SAMPLE_SIZE } from "@/lib/performance/findMessagesSource";
import { DeliveryStatus, Period } from "@/lib/performance/types";
import { usePerformanceOverview } from "@/lib/queries/performance/usePerformanceOverview";

const PERIODS: Period[] = ["24h", "7d", "30d"];

const COLOR_SENT = "#189d68";
const COLOR_RECEIVED = "#3b82f6";

// Rampa ordinal: quanto mais avançado o estado, mais saturado. Falha usa a cor
// reservada de erro e nunca entra na rampa.
const DELIVERY_COLORS: Record<DeliveryStatus, string> = {
  READ: "#189d68",
  DELIVERY_ACK: "#45b98a",
  SERVER_ACK: "#8ed4b5",
  PENDING: "#9ca3af",
  ERROR: "#dc2626",
};

const DELIVERY_ORDER: DeliveryStatus[] = ["READ", "DELIVERY_ACK", "SERVER_ACK", "PENDING", "ERROR"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.3)",
  background: "rgba(24,24,27,.95)",
  color: "#fff",
};

function StatTile({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone?: "danger" }) {
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
  const { t, i18n } = useTranslation();
  const { instance } = useInstance();
  const [period, setPeriod] = useState<Period>("24h");

  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);

  const {
    data: overview,
    isPending,
    isError,
    refetch,
    isFetching,
  } = usePerformanceOverview({
    instanceName: instance?.name ?? null,
    token: instance?.token ?? null,
    period,
    connectionStatus: instance?.connectionStatus ?? "unknown",
    lastDisconnectAt: instance?.disconnectionAt ?? null,
    lastDisconnectReason: instance?.disconnectionReasonCode ?? null,
  });

  /** Rótulo do eixo X: hora para 24h, data para os períodos em dias. */
  const bucketLabel = useMemo(() => {
    const formatter =
      period === "24h"
        ? new Intl.DateTimeFormat(i18n.language, { hour: "2-digit", minute: "2-digit" })
        : new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit" });
    return (iso: string) => formatter.format(new Date(iso));
  }, [period, i18n.language]);

  const series = useMemo(() => (overview?.series ?? []).map((point) => ({ ...point, label: bucketLabel(point.bucket) })), [overview, bucketLabel]);

  const delivery = useMemo(() => {
    if (!overview) return [];
    return DELIVERY_ORDER.map((status) => ({ status, count: overview.delivery.counts[status] })).filter((item) => item.count > 0);
  }, [overview]);

  const deliveryTotal = delivery.reduce((sum, item) => sum + item.count, 0);
  const errorCount = overview?.delivery.counts.ERROR ?? 0;
  const errorRate = deliveryTotal > 0 ? (errorCount / deliveryTotal) * 100 : 0;

  const header = <BaseHeader title={t("performance.title")} subtitle={instance?.name ? t("performance.subtitle", { name: instance.name }) : undefined} />;

  const periodSelector = (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((option) => (
        <Button key={option} variant={option === period ? "default" : "outline"} onClick={() => setPeriod(option)} disabled={isFetching}>
          {t("performance.period." + option)}
        </Button>
      ))}
    </div>
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {periodSelector}
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {periodSelector}
        <Alert variant="destructive" className="flex items-center justify-between gap-3">
          <AlertTitle className="font-medium">{t("performance.error")}</AlertTitle>
          <Button variant="outline" onClick={() => refetch()}>
            {t("performance.retry")}
          </Button>
        </Alert>
      </div>
    );
  }

  const percentOf = (value: number) => (overview.totals.total > 0 ? Math.round((value / overview.totals.total) * 100) : 0);

  return (
    <div className="flex flex-col gap-6">
      {header}

      {/* Declara explicitamente o que não pôde ser calculado. Sem isso a tela
          exibiria zero, e um zero ambíguo leva a operação a investigar errado. */}
      {overview.degraded.map((item) => (
        <Alert key={item.metric} variant="warning" className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <AlertTitle className="font-medium">{t("performance.degraded." + item.metric)}</AlertTitle>
        </Alert>
      ))}

      {periodSelector}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t("performance.totals.total")} value={numberFormat.format(overview.totals.total)} icon={<MessageSquare size={16} />} />
        <StatTile
          label={t("performance.totals.sent")}
          value={numberFormat.format(overview.totals.sent)}
          hint={t("performance.totals.share", { percent: percentOf(overview.totals.sent) })}
          icon={<ArrowUpRight size={16} />}
        />
        <StatTile
          label={t("performance.totals.received")}
          value={numberFormat.format(overview.totals.received)}
          hint={t("performance.totals.share", { percent: percentOf(overview.totals.received) })}
          icon={<ArrowDownLeft size={16} />}
        />
        <StatTile
          label={t("performance.totals.failureRate")}
          value={deliveryTotal > 0 ? errorRate.toFixed(1) + "%" : "—"}
          hint={deliveryTotal > 0 ? t("performance.totals.failureHint", { count: errorCount, total: deliveryTotal }) : t("performance.delivery.empty")}
          icon={<AlertTriangle size={16} />}
          tone={errorRate >= 2 ? "danger" : undefined}
        />
      </section>

      <Card className="border-sidebar-border bg-sidebar">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("performance.volume.title")}</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/20" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} stroke="currentColor" className="text-muted-foreground" />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [numberFormat.format(value), name]} />
              <Legend />
              <Area type="monotone" dataKey="received" name={t("performance.totals.received")} stackId="volume" stroke={COLOR_RECEIVED} strokeWidth={2} fill={COLOR_RECEIVED} fillOpacity={0.3} />
              <Area type="monotone" dataKey="sent" name={t("performance.totals.sent")} stackId="volume" stroke={COLOR_SENT} strokeWidth={2} fill={COLOR_SENT} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-sidebar-border bg-sidebar">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("performance.connection.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("performance.connection.status")}</span>
              <InstanceStatus status={overview.connection.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("performance.connection.lastDisconnect")}</span>
              <span>{overview.connection.lastDisconnectAt ? new Date(overview.connection.lastDisconnectAt).toLocaleString(i18n.language) : t("performance.connection.never")}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("performance.connection.reason")}</span>
              <span className="font-mono">{overview.connection.lastDisconnectReason ?? "—"}</span>
            </div>
            {!overview.connection.historyAvailable && (
              <p className="border-t border-sidebar-border pt-3 text-xs text-muted-foreground">{t("performance.connection.historyUnavailable")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-sidebar">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("performance.delivery.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {delivery.length === 0 && <p className="text-sm text-muted-foreground">{t("performance.delivery.empty")}</p>}

            {delivery.map((item) => {
              const percent = deliveryTotal > 0 ? (item.count / deliveryTotal) * 100 : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DELIVERY_COLORS[item.status] }} />
                      <span className={item.status === "ERROR" ? "font-medium text-red-500" : ""}>{t("performance.delivery." + item.status)}</span>
                    </span>
                    <span className="font-medium">
                      {numberFormat.format(item.count)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{percent.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-muted">
                    <div className="h-full rounded-sm" style={{ width: percent + "%", background: DELIVERY_COLORS[item.status] }} />
                  </div>
                </div>
              );
            })}

            {overview.delivery.sampled && (
              <p className="border-t border-sidebar-border pt-3 text-xs text-muted-foreground">
                {t("performance.delivery.sampleNotice", { count: overview.delivery.sampleSize, max: DELIVERY_SAMPLE_SIZE })}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-sidebar-border bg-sidebar">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("performance.types.title")}</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {overview.messageTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("performance.types.empty")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.messageTypes} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-muted-foreground/20" />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                <YAxis type="category" dataKey="type" width={150} fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip cursor={{ fill: "rgba(127,127,127,.12)" }} contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [numberFormat.format(value), t("performance.types.tooltip")]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {overview.messageTypes.map((entry) => (
                    <Cell key={entry.type} fill={COLOR_SENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-right text-xs text-muted-foreground">{t("performance.loadTime", { ms: numberFormat.format(overview.loadTimeMs) })}</p>
    </div>
  );
}

export { Performance };
