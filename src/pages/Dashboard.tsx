import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Server,
  Cpu,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Provider, RequestLog, UsageStat } from "@/types";

export function Dashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentLogs, setRecentLogs] = useState<RequestLog[]>([]);
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: provData }, { data: logData }, { data: statData }] = await Promise.all([
        supabase.from("providers").select("*").order("priority", { ascending: true }),
        supabase.from("request_logs").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("usage_stats").select("*").order("date", { ascending: false }).limit(30),
      ]);

      setProviders(provData as Provider[] ?? []);
      setRecentLogs(logData as RequestLog[] ?? []);
      setStats(statData as UsageStat[] ?? []);

      const { count } = await supabase.from("request_logs").select("*", { count: "exact", head: true });
      setTotalRequests(count ?? 0);

      const { count: errCount } = await supabase
        .from("request_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "error");
      setTotalErrors(errCount ?? 0);

      const { data: tokenData } = await supabase
        .from("request_logs")
        .select("tokens_used, response_time")
        .eq("status", "success");
      const tokens = (tokenData ?? []).reduce((sum, r) => sum + (r.tokens_used ?? 0), 0);
      setTotalTokens(tokens);
      const times = (tokenData ?? []).map((r) => r.response_time ?? 0).filter((t) => t > 0);
      setAvgResponseTime(times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0);

      setLoading(false);
    }
    fetchData();
  }, []);

  const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
  const activeProviders = providers.filter((p) => p.status === "active").length;

  const statCards = [
    { label: "Total Requests", value: totalRequests.toLocaleString(), icon: Activity, color: "cyan", change: "" },
    { label: "Success Rate", value: `${successRate.toFixed(1)}%`, icon: CheckCircle2, color: "emerald", change: `${totalErrors} errors` },
    { label: "Avg Response", value: `${avgResponseTime.toFixed(2)}s`, icon: Clock, color: "amber", change: "" },
    { label: "Total Tokens", value: totalTokens.toLocaleString(), icon: Cpu, color: "violet", change: "" },
  ];

  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
  };

  // Build chart data from stats - last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const chartData = last7Days.map((date) => {
    const dayStats = stats.filter((s) => s.date === date);
    return {
      date,
      requests: dayStats.reduce((sum, s) => sum + s.requests_count, 0),
      tokens: dayStats.reduce((sum, s) => sum + s.tokens_used, 0),
    };
  });

  const maxRequests = Math.max(...chartData.map((d) => d.requests), 1);

  // Provider usage breakdown
  const providerUsage = new Map<string, number>();
  stats.forEach((s) => {
    providerUsage.set(s.provider, (providerUsage.get(s.provider) ?? 0) + s.requests_count);
  });
  const providerUsageList = Array.from(providerUsage.entries()).sort((a, b) => b[1] - a[1]);
  const totalProviderUsage = providerUsageList.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Gateway overview and analytics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${colorMap[card.color]} border rounded-xl p-5 backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{card.label}</p>
                  <p className="text-2xl font-bold mt-2 text-white">{card.value}</p>
                  {card.change && <p className="text-xs text-slate-500 mt-1">{card.change}</p>}
                </div>
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colorMap[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-lg">Request Activity</h2>
              <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {chartData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500 hover:from-cyan-500 hover:to-cyan-300 group relative"
                    style={{ height: `${(d.requests / maxRequests) * 100}%`, minHeight: d.requests > 0 ? "4px" : "0" }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-slate-300 whitespace-nowrap">
                      {d.requests}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Provider usage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-lg">Provider Usage</h2>
              <p className="text-xs text-slate-500 mt-1">By request count</p>
            </div>
            <Server className="w-5 h-5 text-slate-600" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : providerUsageList.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No usage data yet</p>
          ) : (
            <div className="space-y-3">
              {providerUsageList.slice(0, 6).map(([name, count]) => {
                const pct = totalProviderUsage > 0 ? (count / totalProviderUsage) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-300">{name}</span>
                      <span className="text-slate-500 text-xs">{count} req</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent requests + active providers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="font-semibold text-lg">Recent Requests</h2>
            <p className="text-xs text-slate-500 mt-1">Latest 10 requests</p>
          </div>
          <div className="divide-y divide-slate-800">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No requests logged yet</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                  {log.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{log.provider}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{log.model ?? "unknown"}</span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-rose-400/70 truncate mt-0.5">{log.error_message}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">
                      {log.response_time != null ? `${log.response_time.toFixed(2)}s` : "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(log.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active providers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-lg">Providers</h2>
              <p className="text-xs text-slate-500 mt-1">{activeProviders} active</p>
            </div>
            <Zap className="w-5 h-5 text-slate-600" />
          </div>
          <div className="space-y-2">
            {providers.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-slate-600"}`}
                  />
                  <span className="text-sm text-slate-300">{p.name}</span>
                </div>
                <span className={`text-xs ${p.type === "token_free" ? "text-amber-400" : "text-cyan-400"}`}>
                  {p.type === "token_free" ? "Free" : "API Key"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
