"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpServer = createMcpServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv_1 = __importDefault(require("dotenv"));
const crawler_1 = require("./crawler/crawler");
const session_1 = require("./crawler/session");
const seoAudit_1 = require("./analyzer/seoAudit");
const siteTree_1 = require("./analyzer/siteTree");
const topicClassifier_1 = require("./classifier/topicClassifier");
const extractor_1 = require("./crawler/extractor");
const contentRatio_1 = require("./classifier/contentRatio");
const report_1 = require("./utils/report");
const taxonomy_1 = require("./config/taxonomy");
dotenv_1.default.config();
// Tool Definitions
const CRAWL_WEBSITE_TOOL = {
    name: "crawl_website",
    description: "Crawl toàn bộ hoặc một phần website để thu thập toàn bộ dữ liệu URL, Title, H1-H4, Meta robots, Canonical, Word count, Inlinks/Outlinks, Anchor texts và Bold keywords.",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "URL gốc của website cần quét (ví dụ: https://homecaresausinh.com)"
            },
            mode: {
                type: "string",
                enum: ["full", "sitemap", "fast"],
                description: "Chế độ quét: 'full' (quét theo liên kết nội bộ), 'sitemap' (quét qua XML sitemap), 'fast' (quét nhanh trang chủ và menu). Mặc định: 'full'"
            },
            sitemapUrl: {
                type: "string",
                description: "URL sitemap tùy chọn nếu muốn chỉ định trực tiếp (ví dụ: https://example.com/sitemap.xml)"
            },
            maxDepth: {
                type: "number",
                description: "Độ sâu quét tối đa (mặc định: 3)"
            },
            maxPages: {
                type: "number",
                description: "Số trang tối đa cần quét (mặc định: 100)"
            },
            includePattern: {
                type: "string",
                description: "Regex hoặc chuỗi mẫu để chỉ quét các URL khớp (ví dụ: '/dich-vu|/blog')"
            },
            excludePattern: {
                type: "string",
                description: "Regex hoặc chuỗi mẫu để bỏ qua URL (ví dụ: '/tag|/cart|/checkout')"
            },
            concurrency: {
                type: "number",
                description: "Số lượng request đồng thời (mặc định: 3, tối đa 10)"
            },
            delayMs: {
                type: "number",
                description: "Độ trễ giữa các request tính bằng ms để tránh quá tải máy chủ (mặc định: 200)"
            }
        },
        required: ["url"]
    }
};
const AUDIT_SEO_ISSUES_TOOL = {
    name: "audit_seo_issues",
    description: "Phát hiện toàn diện các lỗi SEO On-page & kỹ thuật: 404 Not Found, 410 Gone, 301/302 Redirect, thiếu/trùng Title, Title dài > 60 ký tự, thiếu Meta description, thiếu/nhiều H1, Thin content (<250 từ), Duplicate content, Noindex, liên kết gãy.",
    inputSchema: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "ID phiên quét trước đó (nếu bỏ trống sẽ lấy phiên quét gần nhất)"
            },
            filterSeverity: {
                type: "string",
                enum: ["all", "critical", "warning", "info"],
                description: "Lọc lỗi theo mức độ nghiêm trọng. Mặc định: 'all'"
            },
            filterCategory: {
                type: "string",
                enum: ["all", "status", "meta", "content", "indexing", "links"],
                description: "Lọc lỗi theo danh mục. Mặc định: 'all'"
            }
        }
    }
};
const ANALYZE_SITE_STRUCTURE_TOOL = {
    name: "analyze_site_structure",
    description: "Tự động xây dựng sơ đồ phân cấp website (Site Hierarchy Tree), phân bố độ sâu URL, phát hiện trang mồ côi (Orphan Pages - 0 internal links) và thống kê các trang được trỏ link nhiều nhất.",
    inputSchema: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "ID phiên quét (nếu bỏ trống sẽ lấy phiên gần nhất)"
            }
        }
    }
};
const CLASSIFY_CONTENT_TOPICS_TOOL = {
    name: "classify_content_topics",
    description: "Phân loại chủ đề nội dung toàn bộ URL đã crawl theo khung Taxonomy Mẹ & Bé (12 Topic chuẩn + Subtopic + Specific Topic + Context + Location + Confidence). Xuất báo cáo Tỷ trọng nội dung (Content Ratio) và xác định chủ đề viết nhiều nhất / chủ đề bị bỏ quên (Content Gap).",
    inputSchema: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "ID phiên quét (nếu bỏ trống sẽ lấy phiên gần nhất)"
            },
            topicFilter: {
                type: "string",
                description: "Lọc kết quả theo một Topic cụ thể (ví dụ: 'DỊCH VỤ MẸ & BÉ' hoặc 'TRẺ SƠ SINH')"
            }
        }
    }
};
const CLASSIFY_SINGLE_URL_OR_TEXT_TOOL = {
    name: "classify_single_url_or_text",
    description: "Phân loại tức thì một bài viết, tiêu đề hoặc từ khóa tìm kiếm thành Topic -> Subtopic -> Specific Topic -> Context -> Location mà không cần crawl cả website.",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "URL hoặc slug bài viết (ví dụ: /dich-vu-tam-be-tai-nha-ha-noi-gia-bao-nhieu)"
            },
            title: {
                type: "string",
                description: "Tiêu đề bài viết hoặc câu hỏi tìm kiếm (ví dụ: 'Dịch vụ tắm bé tại nhà Hà Nội giá bao nhiêu?')"
            },
            h1: {
                type: "string",
                description: "Tiêu đề thẻ H1 (tùy chọn)"
            },
            headings: {
                type: "array",
                items: { type: "string" },
                description: "Danh sách tiêu đề phụ H2, H3 (tùy chọn)"
            },
            boldKeywords: {
                type: "array",
                items: { type: "string" },
                description: "Các từ khóa in đậm strong/b (tùy chọn)"
            },
            mainText: {
                type: "string",
                description: "Đoạn văn trích dẫn hoặc nội dung chính (tùy chọn)"
            }
        }
    }
};
const EXPORT_CRAWL_REPORT_TOOL = {
    name: "export_crawl_report",
    description: "Xuất báo cáo tổng hợp hoàn chỉnh (Tổng quan + Lỗi SEO On-page + Cây cấu trúc Website + Tỷ trọng Phân loại Chủ đề Mẹ & Bé) định dạng Markdown hoặc JSON.",
    inputSchema: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "ID phiên quét (nếu bỏ trống sẽ lấy phiên gần nhất)"
            },
            format: {
                type: "string",
                enum: ["markdown", "json"],
                description: "Định dạng xuất: 'markdown' (mặc định) hoặc 'json'"
            }
        }
    }
};
const GET_TAXONOMY_TOOL = {
    name: "get_taxonomy",
    description: "Trả về toàn bộ bộ khung Taxonomy ngành Mẹ & Bé (12 Topic chính, danh sách Subtopic, Specific Topics, danh mục Content Context và danh sách Địa phương Location) để tham khảo.",
    inputSchema: {
        type: "object",
        properties: {}
    }
};
function createMcpServer() {
    const server = new index_js_1.Server({
        name: "seo-crawler-mcp",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // List Tools Handler
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        return {
            tools: [
                CRAWL_WEBSITE_TOOL,
                AUDIT_SEO_ISSUES_TOOL,
                ANALYZE_SITE_STRUCTURE_TOOL,
                CLASSIFY_CONTENT_TOPICS_TOOL,
                CLASSIFY_SINGLE_URL_OR_TEXT_TOOL,
                EXPORT_CRAWL_REPORT_TOOL,
                GET_TAXONOMY_TOOL
            ]
        };
    });
    // Call Tool Handler
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case "crawl_website": {
                    const url = args?.url;
                    if (!url) {
                        return {
                            content: [{ type: "text", text: "Vui lòng cung cấp tham số 'url' website cần quét." }],
                            isError: true
                        };
                    }
                    const crawler = new crawler_1.WebsiteCrawler({
                        url,
                        mode: args?.mode,
                        sitemapUrl: args?.sitemapUrl,
                        maxDepth: args?.maxDepth,
                        maxPages: args?.maxPages,
                        includePattern: args?.includePattern,
                        excludePattern: args?.excludePattern,
                        concurrency: args?.concurrency,
                        delayMs: args?.delayMs
                    });
                    const session = await crawler.crawl();
                    const pageCount = Object.keys(session.pages).length;
                    // Perform instant quick summary
                    const audit = (0, seoAudit_1.performSEOAudit)(session.pages);
                    const classifications = Object.values(session.pages)
                        .filter(p => p.isArticle !== false && p.url !== session.rootUrl && !(0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
                        .map(p => (0, topicClassifier_1.classifyPage)(p));
                    const contentRatio = (0, contentRatio_1.computeContentRatio)(classifications);
                    const summaryText = [
                        `Đã hoàn thành quét website: ${url}`,
                        `- Session ID: ${session.id}`,
                        `- Tổng số trang đã crawl: ${pageCount} URL`,
                        `- Thời gian thực hiện: ${(session.durationMs / 1000).toFixed(1)}s`,
                        `- Phát hiện lỗi SEO: ${audit.totalIssues} lỗi (${audit.criticalCount} Critical, ${audit.warningCount} Warning)`,
                        `- Chủ đề được viết nhiều nhất: ${contentRatio.topTopic ? `${contentRatio.topTopic.topic} (${contentRatio.topTopic.count} bài - ${contentRatio.topTopic.ratio}%)` : "Chưa có dữ liệu"}`,
                        `- Chủ đề con nhiều nhất: ${contentRatio.topSubtopic ? `${contentRatio.topSubtopic.subtopic} (${contentRatio.topSubtopic.count} bài)` : "Chưa có dữ liệu"}`,
                        "",
                        `Bạn có thể gọi các tool tiếp theo với sessionId="${session.id}":`,
                        `1. 'audit_seo_issues': Xem chi tiết các lỗi SEO 404, 301, Title trùng/dài, H1, Thin content...`,
                        `2. 'analyze_site_structure': Xem cây cấu trúc website (Hierarchy Tree) và trang mồ côi (Orphan pages).`,
                        `3. 'classify_content_topics': Xem chi tiết phân loại từng URL và ma trận tỷ trọng nội dung.`,
                        `4. 'export_crawl_report': Xuất báo cáo tổng hợp Markdown/JSON hoàn chỉnh.`
                    ].join("\n");
                    return {
                        content: [{ type: "text", text: summaryText }],
                        isError: false
                    };
                }
                case "audit_seo_issues": {
                    const sessionId = args?.sessionId || (0, session_1.getLatestSessionId)();
                    const session = (0, session_1.getSession)(sessionId);
                    if (!session) {
                        return {
                            content: [{ type: "text", text: `Không tìm thấy phiên quét với ID: "${sessionId}". Hãy chạy 'crawl_website' trước.` }],
                            isError: true
                        };
                    }
                    const audit = (0, seoAudit_1.performSEOAudit)(session.pages);
                    const filterSeverity = args?.filterSeverity || "all";
                    const filterCategory = args?.filterCategory || "all";
                    let displayedIssues = [];
                    if (filterCategory === "all") {
                        displayedIssues = [
                            ...audit.issuesByCategory.status,
                            ...audit.issuesByCategory.meta,
                            ...audit.issuesByCategory.content,
                            ...audit.issuesByCategory.indexing,
                            ...audit.issuesByCategory.links
                        ];
                    }
                    else {
                        displayedIssues = audit.issuesByCategory[filterCategory] || [];
                    }
                    if (filterSeverity !== "all") {
                        displayedIssues = displayedIssues.filter(i => i.severity === filterSeverity);
                    }
                    const resObj = {
                        website: session.rootUrl,
                        sessionId: session.id,
                        totalPages: audit.totalPages,
                        totalIssues: audit.totalIssues,
                        criticalCount: audit.criticalCount,
                        warningCount: audit.warningCount,
                        infoCount: audit.infoCount,
                        summary: audit.summary,
                        filteredIssuesCount: displayedIssues.length,
                        issues: displayedIssues.slice(0, 100)
                    };
                    return {
                        content: [{ type: "text", text: JSON.stringify(resObj, null, 2) }],
                        isError: false
                    };
                }
                case "analyze_site_structure": {
                    const sessionId = args?.sessionId || (0, session_1.getLatestSessionId)();
                    const session = (0, session_1.getSession)(sessionId);
                    if (!session) {
                        return {
                            content: [{ type: "text", text: `Không tìm thấy phiên quét với ID: "${sessionId}". Hãy chạy 'crawl_website' trước.` }],
                            isError: true
                        };
                    }
                    const structure = (0, siteTree_1.buildSiteStructure)(session.pages, session.rootUrl);
                    const output = [
                        `# CẤU TRÚC PHÂN CẤP WEBSITE (${session.rootUrl})`,
                        `Tổng số URL: ${Object.keys(session.pages).length}`,
                        "",
                        `## 1. Sơ đồ cây phân cấp (Site Hierarchy Tree):`,
                        "```text",
                        structure.asciiTree.trim(),
                        "```",
                        "",
                        `## 2. Phân bố theo độ sâu URL (Depth Distribution):`,
                        ...Object.entries(structure.depthDistribution).map(([d, c]) => `- Cấp độ ${d}: ${c} trang`),
                        "",
                        `## 3. Các chuyên mục chính (Sections Summary):`,
                        ...structure.sectionsSummary.map(s => `- \`${s.section}\`: ${s.pageCount} trang`),
                        "",
                        `## 4. Trang mồ côi (Orphan Pages - 0 Inlinks nội bộ):`,
                        `Tìm thấy ${structure.orphanPages.length} trang mồ côi:`,
                        ...structure.orphanPages.slice(0, 15).map(p => `- [${p.title}](${p.url}) (Độ sâu ${p.depth})`),
                        "",
                        `## 5. Top 10 Trang được trỏ link nội bộ nhiều nhất (Top Internal Links):`,
                        ...structure.topLinkedPages.slice(0, 10).map(p => `- \`${p.url}\`: ${p.inlinkCount} inlinks ("${p.title}")`)
                    ].join("\n");
                    return {
                        content: [{ type: "text", text: output }],
                        isError: false
                    };
                }
                case "classify_content_topics": {
                    const sessionId = args?.sessionId || (0, session_1.getLatestSessionId)();
                    const session = (0, session_1.getSession)(sessionId);
                    if (!session) {
                        return {
                            content: [{ type: "text", text: `Không tìm thấy phiên quét với ID: "${sessionId}". Hãy chạy 'crawl_website' trước.` }],
                            isError: true
                        };
                    }
                    const topicFilter = args?.topicFilter?.toLowerCase();
                    let classifications = Object.values(session.pages)
                        .filter(p => p.isArticle !== false && p.url !== session.rootUrl && !(0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
                        .map(p => (0, topicClassifier_1.classifyPage)(p));
                    if (topicFilter) {
                        classifications = classifications.filter(c => c.topic.toLowerCase().includes(topicFilter));
                    }
                    const contentRatio = (0, contentRatio_1.computeContentRatio)(classifications);
                    const result = {
                        website: session.rootUrl,
                        sessionId: session.id,
                        totalArticlesClassified: classifications.length,
                        topTopic: contentRatio.topTopic,
                        topSubtopic: contentRatio.topSubtopic,
                        topicDistributions: contentRatio.topicDistributions,
                        contextBreakdown: contentRatio.contextBreakdown,
                        locationBreakdown: contentRatio.locationBreakdown,
                        contentGaps: contentRatio.contentGaps,
                        sampleClassifiedArticles: classifications.slice(0, 30)
                    };
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                        isError: false
                    };
                }
                case "classify_single_url_or_text": {
                    const inputUrl = args?.url;
                    const title = args?.title;
                    const h1 = args?.h1;
                    const headings = args?.headings;
                    const boldKeywords = args?.boldKeywords;
                    const mainText = args?.mainText;
                    if (!inputUrl && !title && !h1 && !mainText) {
                        return {
                            content: [{ type: "text", text: "Vui lòng cung cấp ít nhất một trong các thông tin: 'url', 'title', 'h1', hoặc 'mainText'." }],
                            isError: true
                        };
                    }
                    const result = (0, topicClassifier_1.classifyContent)({
                        url: inputUrl,
                        title,
                        h1,
                        headings,
                        boldKeywords,
                        mainText
                    });
                    const formatted = [
                        `# KẾT QUẢ PHÂN LOẠI CHỦ ĐỀ MẸ & BÉ`,
                        `- Input Title: "${title || "(Không có)"}"`,
                        `- Input URL: ${inputUrl || "(Không có)"}`,
                        "",
                        `| Chiều phân loại | Giá trị xác định | Ghi chú |`,
                        `| :--- | :--- | :--- |`,
                        `| **Topic chính** | **${result.topic}** | Thuộc 12 Topic chuẩn ngành Mẹ & Bé |`,
                        `| **Subtopic** | **${result.subtopic}** | Phân loại cấp 2 |`,
                        `| **Specific Topic** | **${result.specificTopic || "Không có"}** | Chủ đề chi tiết chuyên sâu |`,
                        `| **Content Context** | **${result.context || "Chung / Không xác định"}** | Định dạng / Ý định người đọc |`,
                        `| **Location** | **${result.location || "Toàn quốc / Chung"}** | Khu vực địa phương xác định |`,
                        `| **Độ tin cậy (Confidence)** | **${(result.confidence * 100).toFixed(1)}%** | Thuật toán Semantic Matching |`,
                        "",
                        `Từ khóa nhận diện khớp: ${result.matchedKeywords.length > 0 ? result.matchedKeywords.map(k => `\`${k}\``).join(", ") : "Không có"}`
                    ].join("\n");
                    return {
                        content: [{ type: "text", text: formatted }],
                        isError: false
                    };
                }
                case "export_crawl_report": {
                    const sessionId = args?.sessionId || (0, session_1.getLatestSessionId)();
                    const session = (0, session_1.getSession)(sessionId);
                    if (!session) {
                        return {
                            content: [{ type: "text", text: `Không tìm thấy phiên quét với ID: "${sessionId}". Hãy chạy 'crawl_website' trước.` }],
                            isError: true
                        };
                    }
                    const audit = (0, seoAudit_1.performSEOAudit)(session.pages);
                    const structure = (0, siteTree_1.buildSiteStructure)(session.pages, session.rootUrl);
                    const classifications = Object.values(session.pages)
                        .filter(p => p.isArticle !== false && p.url !== session.rootUrl && !(0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
                        .map(p => (0, topicClassifier_1.classifyPage)(p));
                    const contentRatio = (0, contentRatio_1.computeContentRatio)(classifications);
                    const format = args?.format || "markdown";
                    if (format === "json") {
                        return {
                            content: [{
                                    type: "text",
                                    text: JSON.stringify({
                                        session,
                                        audit,
                                        structure,
                                        contentRatio,
                                        classifications
                                    }, null, 2)
                                }],
                            isError: false
                        };
                    }
                    const mdReport = (0, report_1.generateMarkdownReport)(session, audit, structure, contentRatio, classifications);
                    return {
                        content: [{ type: "text", text: mdReport }],
                        isError: false
                    };
                }
                case "get_taxonomy": {
                    const result = {
                        topics: taxonomy_1.MOTHER_BABY_TAXONOMY,
                        contexts: taxonomy_1.CONTEXT_LIST,
                        locations: taxonomy_1.LOCATION_LIST
                    };
                    return {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                        isError: false
                    };
                }
                default:
                    return {
                        content: [{ type: "text", text: `Không tìm thấy tool: ${name}` }],
                        isError: true
                    };
            }
        }
        catch (error) {
            return {
                content: [{ type: "text", text: `Lỗi xử lý tool ${name}: ${error.message}` }],
                isError: true
            };
        }
    });
    return server;
}
