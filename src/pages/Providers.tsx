import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Server,
  Key,
  Globe,
  ChevronUp,
  ChevronDown,
  X,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Provider } from "@/types";

export function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "api_key" as "api_key" | "token_free",
    base_url: "",
    api_key: "",
    models: "",
    priority: 100,
  });

  async function fetchProviders() {
    setLoading(true);
    const { data } = await supabase.from("providers").select("*").order("priority", { ascending: true });
    setProviders((data as Provider[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  async function toggleStatus(p: Provider) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    await supabase.from("providers").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", p.id);
    fetchProviders();
  }

  async function movePriority(p: Provider, dir: "up" | "down") {
    const newPriority = dir === "up" ? p.priority - 5 : p.priority + 5;
    await supabase.from("providers").update({ priority: newPriority, updated_at: new Date().toISOString() }).eq("id", p.id);
    fetchProviders();
  }

  async function deleteProvider(p: Provider) {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    await supabase.from("providers").delete().eq("id", p.id);
    fetchProviders();
  }

  function resetForm() {
    setForm({ name: "", type: "api_key", base_url: "", api_key: "", models: "", priority: 100 });
    setEditingId(null);
    setError("");
  }

  async function saveProvider() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    const modelsArray = form.models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      base_url: form.base_url.trim() || null,
      api_key: form.api_key.trim() || null,
      models: modelsArray,
      priority: form.priority,
      status: "active" as const,
    };

    if (editingId) {
      let updatePayload: Record<string, unknown> = { ...payload, updated_at: new Date().toISOString() };
      if (!form.api_key.trim()) {
        const { api_key: _omit, ...rest } = updatePayload;
        void _omit;
        updatePayload = rest;
      }
      await supabase.from("providers").update(updatePayload).eq("id", editingId);
    } else {
      await supabase.from("providers").insert(payload);
    }

    resetForm();
    setShowAdd(false);
    fetchProviders();
  }

  function editProvider(p: Provider) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      base_url: p.base_url ?? "",
      api_key: "",
      models: p.models.join(", "),
      priority: p.priority,
    });
    setShowAdd(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage AI service providers and their priorities</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Provider list */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)
        ) : providers.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
            <Server className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No providers configured yet</p>
          </div>
        ) : (
          providers.map((p, idx) => (
            <div
              key={p.id}
              className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                p.status === "active" ? "border-slate-700" : "border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Priority controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => movePriority(p, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-center text-slate-500 font-mono w-6">{p.priority}</span>
                  <button
                    onClick={() => movePriority(p, "down")}
                    disabled={idx === providers.length - 1}
                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Provider info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-100">{p.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.type === "token_free"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}
                    >
                      {p.type === "token_free" ? "Token-Free" : "API Key"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-700/30 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {p.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                    {p.base_url && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {p.base_url}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      {p.api_key ? "Key set" : "No key"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {p.models.length} model{p.models.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {p.models.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {p.models.slice(0, 5).map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400 font-mono">
                          {m}
                        </span>
                      ))}
                      {p.models.length > 5 && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-500">
                          +{p.models.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editProvider(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(p)}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    title={p.status === "active" ? "Deactivate" : "Activate"}
                  >
                    {p.status === "active" ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteProvider(p)}
                    className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold">{editingId ? "Edit Provider" : "Add Provider"}</h2>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. OpenRouter, Groq, OpenAI"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setForm({ ...form, type: "api_key" })}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      form.type === "api_key"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    API Key
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: "token_free" })}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      form.type === "token_free"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    Token-Free
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  API Key {editingId && <span className="text-slate-600">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Models (comma-separated)</label>
                <input
                  type="text"
                  value={form.models}
                  onChange={(e) => setForm({ ...form, models: e.target.value })}
                  placeholder="gpt-4o, gpt-4o-mini, claude-3.5-sonnet"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority (lower = higher priority)</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                onClick={() => { setShowAdd(false); resetForm(); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProvider}
                className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
              >
                {editingId ? "Save Changes" : "Add Provider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
