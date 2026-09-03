import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Search, RefreshCw, Clock, Cpu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RequestLog } from "@/types";

export function Logs() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 25;

  async function fetchLogs(reset = false) {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    const offset = currentPage * PAGE_SIZE;

    let query = supabase
      .from("request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    const newLogs = (data as RequestLog[]) ?? [];

    if (reset) {
      setLogs(newLogs);
      setPage(0);
    } else {
      setLogs((prev) => [...prev, ...newLogs]);
    }
    setHasMore(newLogs.length === PAGE_SIZE);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.provider.toLowerCase().includes(s) ||
      (log.model?.toLowerCase().includes(s) ?? false) ||
      (log.error_message?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request Logs</h1>
        <p className="text-slate-500 text-sm mt-1">All requests processed by the gateway</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by provider, model, or error..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {(["all", "success", "error"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchLogs(true)}
          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Provider</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Model</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Response Time</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tokens</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Error</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-500">
                    No logs found
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">{log.provider}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">{log.model ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {log.response_time != null ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.response_time.toFixed(2)}s
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {log.tokens_used > 0 ? (
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {log.tokens_used.toLocaleString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-400/70 max-w-xs truncate">
                      {log.error_message ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && !search && (
          <div className="p-4 border-t border-slate-800 text-center">
            <button
              onClick={() => { setPage((p) => p + 1); fetchLogs(false); }}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
