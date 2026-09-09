"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPULAR_MODELS = void 0;
exports.testLLMConnection = testLLMConnection;
exports.streamLLMAnalysis = streamLLMAnalysis;
exports.POPULAR_MODELS = {
    gemini: [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash"
    ],
    openai: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4.5-preview",
        "o3-mini"
    ],
    openrouter: [
        "google/gemini-2.5-pro",
        "google/gemini-2.5-flash",
        "anthropic/claude-3.7-sonnet",
        "openai/gpt-4o",
        "deepseek/deepseek-chat"
    ],
    claude: [
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022"
    ],
    custom: [
        "deepseek-chat",
        "deepseek-r1",
        "llama3.3-70b",
        "custom-model"
    ]
};
async function testLLMConnection(config) {
    try {
        const testPrompt = "Xin chào! Trả lời ngắn gọn 1 câu duy nhất: 'Kết nối thành công!'";
        let reply = "";
        await streamLLMAnalysis(config, "Bạn là trợ lý ảo kiểm tra kết nối.", testPrompt, (chunk) => { reply += chunk; });
        if (reply.trim().length > 0) {
            return { success: true, message: `Kết nối thành công tới ${config.provider} (${config.model}): ${reply.slice(0, 100)}` };
        }
        else {
            return { success: false, message: "Không nhận được phản hồi từ mô hình." };
        }
    }
    catch (err) {
        return { success: false, message: `Lỗi kết nối: ${err.message || String(err)}` };
    }
}
async function streamLLMAnalysis(config, systemPrompt, userPrompt, onChunk) {
    const { provider, apiKey, model, baseUrl } = config;
    if (!apiKey || !apiKey.trim()) {
        throw new Error("Vui lòng nhập API Key.");
    }
    if (!model || !model.trim()) {
        throw new Error("Vui lòng chọn hoặc nhập tên Model.");
    }
    if (provider === "gemini") {
        return await streamGemini(apiKey.trim(), model.trim(), systemPrompt, userPrompt, onChunk);
    }
    else if (provider === "claude") {
        return await streamClaude(apiKey.trim(), model.trim(), systemPrompt, userPrompt, onChunk);
    }
    else {
        // OpenAI, OpenRouter, Custom
        return await streamOpenAICompatible(provider, apiKey.trim(), model.trim(), baseUrl, systemPrompt, userPrompt, onChunk);
    }
}
async function streamGemini(apiKey, model, systemPrompt, userPrompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: userPrompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192
        }
    };
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try {
            const j = JSON.parse(errText);
            parsedMsg = j.error?.message || errText;
        }
        catch { }
        throw new Error(`Google Gemini API Error (${response.status}): ${parsedMsg}`);
    }
    let fullText = "";
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Không thể đọc luồng dữ liệu từ Google Gemini.");
    }
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:"))
                continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr)
                continue;
            try {
                const json = JSON.parse(dataStr);
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    fullText += text;
                    onChunk(text);
                }
            }
            catch {
                // Skip malformed SSE chunk
            }
        }
    }
    if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data:")) {
            try {
                const json = JSON.parse(trimmed.slice(5).trim());
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    fullText += text;
                    onChunk(text);
                }
            }
            catch { }
        }
    }
    return fullText;
}
async function streamOpenAICompatible(provider, apiKey, model, customBaseUrl, systemPrompt, userPrompt, onChunk) {
    let endpoint = "https://api.openai.com/v1/chat/completions";
    if (provider === "openrouter") {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
    }
    else if (provider === "custom" && customBaseUrl && customBaseUrl.trim()) {
        let base = customBaseUrl.trim().replace(/\/+$/, "");
        if (!base.endsWith("/chat/completions")) {
            endpoint = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
        }
        else {
            endpoint = base;
        }
    }
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
    if (provider === "openrouter") {
        headers["HTTP-Referer"] = "http://localhost:3333";
        headers["X-Title"] = "SEO Crawler & Mother-Baby Classifier";
    }
    const payload = {
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        stream: true
    };
    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try {
            const j = JSON.parse(errText);
            parsedMsg = j.error?.message || errText;
        }
        catch { }
        throw new Error(`${provider.toUpperCase()} API Error (${response.status}): ${parsedMsg}`);
    }
    let fullText = "";
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error(`Không thể đọc luồng dữ liệu từ ${provider}.`);
    }
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:"))
                continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]")
                break;
            try {
                const json = JSON.parse(dataStr);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                    fullText += delta;
                    onChunk(delta);
                }
            }
            catch {
                // Skip malformed SSE chunk
            }
        }
    }
    return fullText;
}
async function streamClaude(apiKey, model, systemPrompt, userPrompt, onChunk) {
    const endpoint = "https://api.anthropic.com/v1/messages";
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
    };
    const payload = {
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 8192,
        temperature: 0.3,
        stream: true
    };
    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try {
            const j = JSON.parse(errText);
            parsedMsg = j.error?.message || errText;
        }
        catch { }
        throw new Error(`Claude API Error (${response.status}): ${parsedMsg}`);
    }
    let fullText = "";
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Không thể đọc luồng dữ liệu từ Anthropic Claude.");
    }
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:"))
                continue;
            const dataStr = trimmed.slice(5).trim();
            try {
                const json = JSON.parse(dataStr);
                if (json.type === "content_block_delta" && json.delta?.text) {
                    fullText += json.delta.text;
                    onChunk(json.delta.text);
                }
            }
            catch {
                // Skip malformed SSE chunk
            }
        }
    }
    return fullText;
}
