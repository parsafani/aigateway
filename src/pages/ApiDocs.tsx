import { useState } from "react";
import { Copy, Check, Terminal, Code2, Zap } from "lucide-react";

export function ApiDocs() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const endpoints = [
    { method: "POST", path: "/v1/chat/completions", desc: "Send a chat completion request" },
    { method: "GET", path: "/v1/models", desc: "List all available models from active providers" },
    { method: "GET", path: "/api/status", desc: "Get gateway status and active provider list" },
  ];

  const examples = {
    curl: `curl -X POST https://aigateway.hooshedigital.ir/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_ACCESS_CODE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
    python: `import requests

response = requests.post(
    "https://aigateway.hooshedigital.ir/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_ACCESS_CODE",
        "Content-Type": "application/json"
    },
    json={
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)

print(response.json()["choices"][0]["message"]["content"])`,
    javascript: `const response = await fetch(
  "https://aigateway.hooshedigital.ir/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_ACCESS_CODE",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }]
    })
  }
);

const data = await response.json();
console.log(data.choices[0].message.content);`,
    openai: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://aigateway.hooshedigital.ir/v1",
  apiKey: "YOUR_ACCESS_CODE"
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }]
});

console.log(response.choices[0].message.content);`,
  };

  const [activeTab, setActiveTab] = useState<keyof typeof examples>("curl");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Documentation</h1>
        <p className="text-slate-500 text-sm mt-1">How to connect your services to the AI Gateway</p>
      </div>

      {/* Quick start */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-lg">Quick Start</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          The gateway is fully compatible with the OpenAI API format. Point any OpenAI-compatible client
          to the gateway URL and use your access code as the API key.
        </p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-sm">
          <span className="text-slate-500">Base URL:</span>
          <span className="text-cyan-400">https://aigateway.hooshedigital.ir/v1</span>
          <button onClick={() => copy("https://aigateway.hooshedigital.ir/v1", "baseurl")} className="ml-auto">
            {copied === "baseurl" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 hover:text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-500" />
            Endpoints
          </h2>
        </div>
        <div className="divide-y divide-slate-800">
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                  ep.method === "GET"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-cyan-500/10 text-cyan-400"
                }`}
              >
                {ep.method}
              </span>
              <code className="text-sm text-slate-200 font-mono flex-1">{ep.path}</code>
              <span className="text-sm text-slate-500 hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code examples */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Code2 className="w-5 h-5 text-slate-500" />
            Code Examples
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-800 pb-px">
          {(Object.keys(examples) as (keyof typeof examples)[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? "bg-slate-800 text-slate-100 border-b-2 border-cyan-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "openai" ? "OpenAI SDK" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative">
          <pre className="p-6 text-sm text-slate-300 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
            <code>{examples[activeTab]}</code>
          </pre>
          <button
            onClick={() => copy(examples[activeTab], activeTab)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {copied === activeTab ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Request/Response format */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Request Body</h3>
          </div>
          <pre className="p-6 text-xs text-slate-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}`}
          </pre>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Response (OpenAI format)</h3>
          </div>
          <pre className="p-6 text-xs text-slate-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}`}
          </pre>
        </div>
      </div>

      {/* Fallback explanation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">How Fallback Works</h2>
        <div className="space-y-3">
          {[
            { step: "1", title: "Priority Order", desc: "Providers are tried in priority order (lower number = higher priority)." },
            { step: "2", title: "Model Matching", desc: "Only providers that support the requested model are attempted." },
            { step: "3", title: "Automatic Fallback", desc: "If a provider returns an error or rate limit, the next provider is tried automatically." },
            { step: "4", title: "Logging", desc: "Every attempt is logged with response time, token usage, and error details." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200">{item.title}</h4>
                <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
