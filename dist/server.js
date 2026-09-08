"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const mcp_1 = require("./mcp");
const crawler_1 = require("./crawler/crawler");
const extractor_1 = require("./crawler/extractor");
const session_1 = require("./crawler/session");
const seoAudit_1 = require("./analyzer/seoAudit");
const siteTree_1 = require("./analyzer/siteTree");
const topicClassifier_1 = require("./classifier/topicClassifier");
const contentRatio_1 = require("./classifier/contentRatio");
const taxonomy_1 = require("./config/taxonomy");
const report_1 = require("./utils/report");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3333;
const mcpTransports = new Map();
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.resolve(__dirname, "../public")));
let activeCrawler = null;
let lastProgress = {
    crawledCount: 0,
    totalQueued: 0,
    currentUrl: "",
    statusCode: 200,
    speedPagesPerSec: 0,
    elapsedSec: 0,
    status: "completed"
};
const sseClients = [];
function broadcastProgress(p) {
    lastProgress = p;
    const data = `data: ${JSON.stringify(p)}\n\n`;
    for (let i = sseClients.length - 1; i >= 0; i--) {
        try {
            sseClients[i].write(data);
            sseClients[i].flush?.();
        }
        catch {
            sseClients.splice(i, 1);
        }
    }
}
// Keep-Alive ping every 10 seconds to maintain open connections
setInterval(() => {
    for (let i = sseClients.length - 1; i >= 0; i--) {
        try {
            sseClients[i].write(": ping\n\n");
            sseClients[i].flush?.();
        }
        catch {
            sseClients.splice(i, 1);
        }
    }
}, 10000);
// SSE Stream for Realtime Crawl Progress
app.get("/api/crawl/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    // Send current state
    res.write(`data: ${JSON.stringify(lastProgress)}\n\n`);
    sseClients.push(res);
    req.on("close", () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1)
            sseClients.splice(idx, 1);
    });
});
// Remote MCP Endpoints (SSE Transport for AI - Codex, Cursor, Claude Desktop)
app.get("/sse", async (req, res) => {
    console.log("[MCP] New SSE client connected");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    const transport = new sse_js_1.SSEServerTransport("/messages", res);
    mcpTransports.set(transport.sessionId, transport);
    transport.onclose = () => {
        console.log(`[MCP] SSE connection closed for session: ${transport.sessionId}`);
        mcpTransports.delete(transport.sessionId);
    };
    const mcpServer = (0, mcp_1.createMcpServer)();
    await mcpServer.connect(transport);
});
app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
    }
    const transport = mcpTransports.get(sessionId);
    if (!transport) {
        res.status(404).send(`Session ${sessionId} not found`);
        return;
    }
    await transport.handlePostMessage(req, res, req.body);
});
// Crawl Status Polling
app.get("/api/crawl/status", (_req, res) => {
    res.json(lastProgress);
});
// Stop Crawling
app.post("/api/crawl/stop", (_req, res) => {
    if (activeCrawler) {
        activeCrawler.abort();
        broadcastProgress({
            ...lastProgress,
            status: "stopped",
            currentUrl: "Đang dừng theo yêu cầu của bạn..."
        });
        res.json({ message: "Đã gửi lệnh dừng quét!" });
    }
    else {
        res.json({ message: "Không có tiến trình quét nào đang chạy." });
    }
});
// Session Analysis Cache & Helper
const analysisCache = new Map();
function getSessionAnalysis(sessionIdOrRaw) {
    const sessionId = !sessionIdOrRaw || sessionIdOrRaw === "latest" ? (0, session_1.getLatestSessionId)() : sessionIdOrRaw;
    if (!sessionId)
        return null;
    if (analysisCache.has(sessionId)) {
        return analysisCache.get(sessionId);
    }
    const session = (0, session_1.getSession)(sessionId);
    if (!session)
        return null;
    const audit = (0, seoAudit_1.performSEOAudit)(session.pages);
    const structure = (0, siteTree_1.buildSiteStructure)(session.pages, session.rootUrl);
    const classifications = Object.values(session.pages)
        .filter(p => p.isArticle !== false && p.url !== session.rootUrl && !(0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
        .map(p => (0, topicClassifier_1.classifyPage)(p));
    const contentRatio = (0, contentRatio_1.computeContentRatio)(classifications);
    const result = { session, audit, structure, contentRatio, classifications };
    analysisCache.set(sessionId, result);
    return result;
}
// Start Crawl (Fully Asynchronous Background Job to prevent Reverse Proxy timeouts)
app.post("/api/crawl", (req, res) => {
    try {
        const { url, mode = "full", sitemapUrl, maxDepth = 3, maxPages = 1000, includePattern, excludePattern, concurrency = 15, delayMs = 0 } = req.body;
        if (!url) {
            return res.status(400).json({ error: "Website URL là bắt buộc" });
        }
        // Abort existing crawl if any
        if (activeCrawler) {
            try {
                activeCrawler.abort();
            }
            catch { }
            activeCrawler = null;
        }
        const crawlerInstance = new crawler_1.WebsiteCrawler({
            url,
            mode,
            sitemapUrl,
            maxDepth: Number(maxDepth),
            maxPages: Number(maxPages),
            includePattern,
            excludePattern,
            concurrency: Number(concurrency),
            delayMs: Number(delayMs),
            onProgress: (p) => {
                broadcastProgress(p);
            }
        });
        activeCrawler = crawlerInstance;
        broadcastProgress({
            crawledCount: 0,
            totalQueued: 1,
            currentUrl: `Bắt đầu quét ${url}...`,
            statusCode: 200,
            speedPagesPerSec: 0,
            elapsedSec: 0,
            status: "running"
        });
        // Respond immediately with 202 Accepted so Nginx/LiteSpeed 60s proxy timeout is NEVER reached!
        res.status(202).json({
            status: "started",
            message: "Tiến trình cào dữ liệu đã bắt đầu chạy ngầm trên máy chủ.",
            url
        });
        // Run crawler asynchronously in background
        (async () => {
            try {
                const session = await crawlerInstance.crawl();
                if (activeCrawler === crawlerInstance) {
                    activeCrawler = null;
                }
                const audit = (0, seoAudit_1.performSEOAudit)(session.pages);
                const structure = (0, siteTree_1.buildSiteStructure)(session.pages, session.rootUrl);
                const classifications = Object.values(session.pages)
                    .filter(p => p.isArticle !== false && p.url !== session.rootUrl && !(0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
                    .map(p => (0, topicClassifier_1.classifyPage)(p));
                const contentRatio = (0, contentRatio_1.computeContentRatio)(classifications);
                analysisCache.set(session.id, { session, audit, structure, contentRatio, classifications });
                broadcastProgress({
                    crawledCount: Object.keys(session.pages).length,
                    totalQueued: Object.keys(session.pages).length,
                    currentUrl: "Đã hoàn thành toàn bộ quá trình quét & phân tích!",
                    statusCode: 200,
                    speedPagesPerSec: Number((Object.keys(session.pages).length / Math.max(1, session.durationMs / 1000)).toFixed(1)),
                    elapsedSec: Math.round(session.durationMs / 1000),
                    status: "completed"
                });
            }
            catch (err) {
                if (activeCrawler === crawlerInstance) {
                    activeCrawler = null;
                }
                broadcastProgress({
                    ...lastProgress,
                    status: "error",
                    error: err.message
                });
            }
        })();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Taxonomy
app.get("/api/taxonomy", (_req, res) => {
    res.json({
        topics: taxonomy_1.MOTHER_BABY_TAXONOMY,
        contexts: taxonomy_1.CONTEXT_LIST,
        locations: taxonomy_1.LOCATION_LIST
    });
});
// Classify Single Query
app.post("/api/classify-single", (req, res) => {
    try {
        const { url, title, h1, headings, boldKeywords, mainText } = req.body;
        const result = (0, topicClassifier_1.classifyContent)({
            url,
            title,
            h1,
            headings,
            boldKeywords,
            mainText
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Session Details
const handleGetSession = (req, res) => {
    const rawId = req.params["id"] || req.query.sessionId;
    const data = getSessionAnalysis(rawId);
    if (!data) {
        res.status(404).json({ error: "Không tìm thấy phiên crawl nào." });
        return;
    }
    const { session, audit, structure, contentRatio, classifications } = data;
    res.json({
        sessionId: session.id,
        rootUrl: session.rootUrl,
        startTime: session.startTime,
        durationMs: session.durationMs,
        options: session.options,
        totalPages: Object.keys(session.pages).length,
        audit,
        structure,
        contentRatio,
        classifications,
        errors: session.errors
    });
};
app.get("/api/session", handleGetSession);
app.get("/api/session/:id", handleGetSession);
app.get("/api/sessions", (_req, res) => {
    res.json((0, session_1.listSessions)());
});
// Export Center APIs
app.get("/api/export/excel", async (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    try {
        const buf = await (0, report_1.generateComprehensiveExcelWorkbook)(data.session, data.audit, data.structure, data.contentRatio, data.classifications);
        let domain = "website";
        try {
            domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
        }
        catch { }
        const filename = `bao-cao-seo-tong-hop-${domain}-${Date.now()}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        if (req.query.inline !== "1") {
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        }
        res.send(buf);
    }
    catch (err) {
        console.error("Error generating Excel:", err);
        res.status(500).send("Lỗi xuất file Excel: " + err.message);
    }
});
app.get("/api/export/articles-csv", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    const csv = (0, report_1.generateArticlesCSV)(data.session, data.audit, data.classifications);
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `danh-sach-bai-viet-seo-${domain}-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.send(csv);
});
app.get("/api/export/issues-csv", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    const csv = (0, report_1.generateIssuesCSV)(data.session, data.audit);
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `bao-cao-loi-seo-${domain}-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.send(csv);
});
app.get("/api/export/topics-csv", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    const csv = (0, report_1.generateTopicsCSV)(data.session, data.contentRatio);
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `ty-trong-chu-de-me-va-be-${domain}-${Date.now()}.csv`;
    res.send(csv);
});
app.get("/api/export/internal-links-csv", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    const csv = (0, report_1.generateInternalLinksCSV)(data.session);
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `internal-links-${domain}-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.send(csv);
});
app.get("/api/export/markdown", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).send("Chưa có phiên crawl nào.");
    const md = (0, report_1.generateMarkdownReport)(data.session, data.audit, data.structure, data.contentRatio, data.classifications);
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `bao-cao-seo-tong-hop-${domain}-${Date.now()}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.send(md);
});
app.get("/api/export/json", (req, res) => {
    const data = getSessionAnalysis(req.query.sessionId);
    if (!data)
        return res.status(404).json({ error: "Chưa có phiên crawl nào." });
    let domain = "website";
    try {
        domain = new URL(data.session.rootUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    }
    catch { }
    const filename = `du-lieu-seo-toan-bo-${domain}-${Date.now()}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (req.query.inline !== "1") {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.send(JSON.stringify({
        sessionId: data.session.id,
        rootUrl: data.session.rootUrl,
        startTime: data.session.startTime,
        durationMs: data.session.durationMs,
        options: data.session.options,
        totalPages: Object.keys(data.session.pages).length,
        audit: data.audit,
        structure: data.structure,
        contentRatio: data.contentRatio,
        classifications: data.classifications,
        rawPages: data.session.pages
    }, null, 2));
});
// List Sessions
app.get("/api/sessions", (_req, res) => {
    res.json((0, session_1.listSessions)());
});
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`SEO CRAWLER & CLASSIFIER WEB DASHBOARD READY!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
