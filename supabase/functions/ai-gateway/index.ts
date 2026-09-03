import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Provider {
  id: string;
  name: string;
  type: "token_free" | "api_key";
  status: "active" | "inactive";
  api_key: string | null;
  base_url: string | null;
  models: string[];
  priority: number;
  config: Record<string, unknown>;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function getActiveProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("status", "active")
    .order("priority", { ascending: true });
  if (error) return [];
  return (data as Provider[]) ?? [];
}

async function verifyAccess(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  const accessCode = await getSetting("access_code");
  return token === accessCode;
}

async function logRequest(
  provider: string,
  model: string,
  status: "success" | "error",
  responseTime: number,
  tokensUsed: number,
  errorMessage?: string
) {
  await supabase.from("request_logs").insert({
    provider,
    model,
    status,
    response_time: responseTime,
    tokens_used: tokensUsed,
    error_message: errorMessage ?? null,
  });

  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("usage_stats")
    .select("*")
    .eq("provider", provider)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    const updates = status === "success"
      ? { requests_count: existing.requests_count + 1, success_count: existing.success_count + 1, tokens_used: existing.tokens_used + tokensUsed }
      : { requests_count: existing.requests_count + 1, error_count: existing.error_count + 1 };
    await supabase.from("usage_stats").update(updates).eq("id", existing.id);
  } else {
    await supabase.from("usage_stats").insert({
      provider,
      date: today,
      requests_count: 1,
      success_count: status === "success" ? 1 : 0,
      error_count: status === "error" ? 1 : 0,
      tokens_used: status === "success" ? tokensUsed : 0,
    });
  }
}

function buildHeaders(provider: Provider): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.api_key}`,
  };
  if (provider.name === "OpenRouter") {
    headers["HTTP-Referer"] = "https://aigateway.hooshedigital.ir";
    headers["X-Title"] = "AI Gateway";
  }
  return headers;
}

async function callProvider(
  provider: Provider,
  body: ChatRequest
): Promise<{ ok: boolean; data?: unknown; error?: string; tokens?: number; stream?: ReadableStream<Uint8Array> }> {
  if (provider.type === "token_free") {
    return {
      ok: false,
      error: "Token-free providers require browser session simulation and are not available in edge runtime.",
    };
  }

  if (!provider.api_key) {
    return { ok: false, error: "No API key configured" };
  }

  const baseUrl = provider.base_url || "https://api.openai.com/v1";
  const url = `${baseUrl}/chat/completions`;

  try {
    const headers = buildHeaders(provider);
    const requestBody = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 4096,
      stream: body.stream ?? false,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, error: `Provider error (${response.status}): ${errorText}` };
    }

    if (body.stream && response.body) {
      return { ok: true, stream: response.body, tokens: 0 };
    }

    const data = await response.json();
    const tokens = data.usage?.total_tokens ?? 0;
    return { ok: true, data, tokens };
  } catch (err) {
    return { ok: false, error: `Network error: ${(err as Error).message}` };
  }
}

async function handleChatCompletions(body: ChatRequest): Promise<Response> {
  const providers = await getActiveProviders();

  if (providers.length === 0) {
    return new Response(
      JSON.stringify({ error: "No active providers configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.models.includes(body.model) && !provider.models.includes("*")) {
      continue;
    }

    const startTime = Date.now();
    const result = await callProvider(provider, body);
    const elapsed = (Date.now() - startTime) / 1000;

    if (result.ok) {
      await logRequest(provider.name, body.model, "success", elapsed, result.tokens ?? 0);

      if (result.stream) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const reader = result.stream!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      return new Response(JSON.stringify(result.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    errors.push(`${provider.name}: ${result.error}`);
    await logRequest(provider.name, body.model, "error", elapsed, 0, result.error);
  }

  return new Response(
    JSON.stringify({
      error: "All providers failed",
      details: errors,
    }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleModels(): Promise<Response> {
  const providers = await getActiveProviders();
  const modelSet = new Set<string>();

  for (const p of providers) {
    for (const m of p.models) {
      if (m !== "*") modelSet.add(m);
    }
  }

  const models = Array.from(modelSet).map((id) => ({
    id,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "ai-gateway",
  }));

  return new Response(JSON.stringify({ object: "list", data: models }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStatus(): Promise<Response> {
  const providers = await getActiveProviders();
  const { count: totalRequests } = await supabase
    .from("request_logs")
    .select("*", { count: "exact", head: true });

  const { count: totalErrors } = await supabase
    .from("request_logs")
    .select("*", { count: "exact", head: true })
    .eq("status", "error");

  return new Response(
    JSON.stringify({
      status: "operational",
      active_providers: providers.length,
      total_requests: totalRequests ?? 0,
      total_errors: totalErrors ?? 0,
      streaming_enabled: true,
      providers: providers.map((p) => ({
        name: p.name,
        type: p.type,
        priority: p.priority,
        models: p.models,
      })),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/ai-gateway", "");

    const isGatewayEndpoint = path.startsWith("/v1/");
    if (isGatewayEndpoint) {
      const authHeader = req.headers.get("Authorization");
      if (!(await verifyAccess(authHeader))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: invalid or missing access code" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (path === "/v1/chat/completions" && req.method === "POST") {
      const body = (await req.json()) as ChatRequest;
      return await handleChatCompletions(body);
    }

    if (path === "/v1/models" && req.method === "GET") {
      return await handleModels();
    }

    if (path === "/api/status" && req.method === "GET") {
      return await handleStatus();
    }

    return new Response(
      JSON.stringify({ error: "Not found", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
