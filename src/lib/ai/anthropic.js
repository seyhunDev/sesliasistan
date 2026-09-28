// Yalnızca sunucuda çalışır. Anahtar tarayıcıya çıkmaz.
export async function callClaude({ model, system, messages, tool, maxTokens = 1024 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name }, // şemaya uygun çıktıyı zorla
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const block = data.content?.find((b) => b.type === "tool_use");
    if (!block) throw new Error("Araç çıktısı gelmedi");
    return block.input;
  } finally {
    clearTimeout(timer);
  }
}
