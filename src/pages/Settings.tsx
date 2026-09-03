import { useState, useEffect } from "react";
import { Save, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Setting } from "@/types";

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const { data } = await supabase.from("settings").select("*").order("key", { ascending: true });
      const settingsData = (data as Setting[]) ?? [];
      setSettings(settingsData);
      const vals: Record<string, string> = {};
      settingsData.forEach((s) => { vals[s.key] = s.value ?? ""; });
      setValues(vals);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function saveAll() {
    setSaving(true);
    for (const s of settings) {
      const newVal = values[s.key] ?? "";
      if (newVal !== (s.value ?? "")) {
        await supabase
          .from("settings")
          .update({ value: newVal, updated_at: new Date().toISOString() })
          .eq("id", s.id);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const friendlyLabels: Record<string, { label: string; desc: string; type?: "text" | "password" | "number" }> = {
    access_code: { label: "Access Code", desc: "Bearer token required for all gateway API calls", type: "password" },
    rate_limit_per_minute: { label: "Rate Limit (per minute)", desc: "Maximum requests per minute per client", type: "number" },
    cors_origins: { label: "CORS Origins", desc: "Comma-separated allowed origins, or * for all" },
    gateway_name: { label: "Gateway Name", desc: "Display name for the gateway" },
    default_model: { label: "Default Model", desc: "Fallback model when none is specified" },
    fallback_enabled: { label: "Fallback Enabled", desc: "Enable automatic provider fallback (true/false)" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Global gateway configuration</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((s) => {
            const meta = friendlyLabels[s.key] ?? { label: s.key, desc: "" };
            return (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-slate-200">{meta.label}</label>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
                  </div>
                  <div className="w-full max-w-xs">
                    <input
                      type={meta.type ?? "text"}
                      value={values[s.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                    <p className="text-xs text-slate-600 mt-1 font-mono">{s.key}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              The access code is sent as a Bearer token in the Authorization header for all API requests.
              Keep it secure.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
