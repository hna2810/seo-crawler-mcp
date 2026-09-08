"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPageData = extractPageData;
const cheerio = __importStar(require("cheerio"));
const text_1 = require("../utils/text");
function extractPageData(html, url, finalUrl, statusCode, contentType, crawlTimeMs, depth, baseDomain) {
    const $ = cheerio.load(html);
    // 1. Meta & Titles
    const title = (0, text_1.cleanText)($("title").first().text() || "");
    const metaDesc = (0, text_1.cleanText)($('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "");
    const metaRobots = (0, text_1.cleanText)($('meta[name="robots"]').attr("content") ||
        $('meta[name="googlebot"]').attr("content") ||
        "");
    const canonicalRaw = $('link[rel="canonical"]').attr("href") || "";
    let canonical = "";
    if (canonicalRaw) {
        try {
            canonical = new URL(canonicalRaw, finalUrl).toString();
        }
        catch {
            canonical = canonicalRaw;
        }
    }
    // 2. Headings
    const h1List = [];
    $("h1").each((_, el) => {
        const txt = (0, text_1.cleanText)($(el).text());
        if (txt)
            h1List.push(txt);
    });
    const h2List = [];
    $("h2").each((_, el) => {
        const txt = (0, text_1.cleanText)($(el).text());
        if (txt)
            h2List.push(txt);
    });
    const h3List = [];
    $("h3").each((_, el) => {
        const txt = (0, text_1.cleanText)($(el).text());
        if (txt)
            h3List.push(txt);
    });
    const h4List = [];
    $("h4").each((_, el) => {
        const txt = (0, text_1.cleanText)($(el).text());
        if (txt)
            h4List.push(txt);
    });
    // 3. Bold Keywords (<strong>, <b>)
    const boldKeywordsSet = new Set();
    $("strong, b").each((_, el) => {
        const txt = (0, text_1.cleanText)($(el).text());
        if (txt && txt.length > 2 && txt.length < 100) {
            boldKeywordsSet.add(txt);
        }
    });
    // 4. Discovery Links (Trích xuất toàn bộ liên kết trên toàn trang bao gồm menu, header, footer để crawler duyệt web)
    const discoveryLinks = [];
    $("a[href]").each((_, el) => {
        const rawHref = $(el).attr("href")?.trim();
        if (!rawHref)
            return;
        if (rawHref.startsWith("#") ||
            rawHref.startsWith("javascript:") ||
            rawHref.startsWith("mailto:") ||
            rawHref.startsWith("tel:")) {
            return;
        }
        try {
            const resolved = new URL(rawHref, finalUrl);
            if (resolved.protocol === "http:" || resolved.protocol === "https:") {
                resolved.hash = "";
                const uStr = resolved.toString();
                if (!discoveryLinks.includes(uStr)) {
                    discoveryLinks.push(uStr);
                }
            }
        }
        catch { }
    });
    // 5. Content extraction for Word Count & Semantic Classification
    // Remove boilerplate: script, style, nav, footer, header, aside, form, svg, noscript, etc.
    const clone$ = cheerio.load(html);
    clone$("script, style, nav, footer, header, aside, form, svg, noscript, iframe, button, " +
        ".header, .footer, .site-header, .site-footer, .main-navigation, .menu, .navbar, .nav, " +
        ".sidebar, #sidebar, .widget, #comments, .comments-area, .breadcrumbs, .breadcrumb, " +
        ".social-share, .share-box, .related-posts, .author-box, .elementor-location-header, .elementor-location-footer").remove();
    // Find the post/article content container
    let $articleContainer = clone$("article, .entry-content, .post-content, .single-post-content, .content-detail, .post-detail, .td-post-content, main, #main, #content").first();
    if (!$articleContainer || $articleContainer.length === 0 || $articleContainer.text().trim().length < 50) {
        $articleContainer = clone$("body");
    }
    const cleanMainText = (0, text_1.cleanText)($articleContainer.text());
    const wordCount = (0, text_1.countWords)(cleanMainText);
    // 6. In-Content Links & Anchor text (CHỈ tính trong phần nội dung bài viết, KHÔNG tính header/footer)
    const outlinks = [];
    let totalInternalLinks = 0;
    let totalExternalLinks = 0;
    $articleContainer.find("a[href]").each((_, el) => {
        const rawHref = $(el).attr("href")?.trim();
        if (!rawHref)
            return;
        if (rawHref.startsWith("#") ||
            rawHref.startsWith("javascript:") ||
            rawHref.startsWith("mailto:") ||
            rawHref.startsWith("tel:")) {
            return;
        }
        try {
            const resolved = new URL(rawHref, finalUrl);
            // Only http / https
            if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
                return;
            }
            // Remove hash
            resolved.hash = "";
            const toUrl = resolved.toString();
            const anchorText = (0, text_1.cleanText)($(el).text());
            const isExternal = resolved.hostname !== baseDomain && !resolved.hostname.endsWith("." + baseDomain);
            if (isExternal) {
                totalExternalLinks++;
            }
            else {
                totalInternalLinks++;
            }
            outlinks.push({
                toUrl,
                anchorText,
                isExternal
            });
        }
        catch {
            // Invalid URL
        }
    });
    // Determine if this is an article/post vs utility/functional page
    let isArticle = true;
    try {
        const parsed = new URL(finalUrl);
        const p = parsed.pathname.toLowerCase();
        if (p === "/" ||
            p === "" ||
            /\/(gio-hang|cart|checkout|thanh-toan|tai-khoan|my-account|lien-he|contact|showroom|cua-hang|shop|sitemap.*|tim-kiem|search|login|dang-nhap|wp-.*|\.xml)$/i.test(p) ||
            /(\/category\/|\/tag\/|\/author\/|\/page\/|\/collections\/)/i.test(p)) {
            isArticle = false;
        }
    }
    catch {
        isArticle = false;
    }
    // 6. Publication & Modified Dates (Ngày đăng bài & Ngày cập nhật gần nhất)
    let rawPublished = $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="article:published_time"]').attr("content") ||
        $('meta[property="og:published_time"]').attr("content") ||
        $('meta[name="pubdate"]').attr("content") ||
        $('meta[name="publishdate"]').attr("content") ||
        $('meta[name="date"]').attr("content") ||
        "";
    let rawModified = $('meta[property="article:modified_time"]').attr("content") ||
        $('meta[name="article:modified_time"]').attr("content") ||
        $('meta[property="og:updated_time"]').attr("content") ||
        "";
    // Check Schema JSON-LD (Rank Math, Yoast SEO, Schema.org Article/BlogPosting)
    $('script[type="application/ld+json"]').each((_, el) => {
        if (rawPublished && rawModified)
            return;
        try {
            const raw = $(el).html();
            if (!raw)
                return;
            const data = JSON.parse(raw);
            const items = Array.isArray(data) ? data : (data["@graph"] || [data]);
            for (const item of items) {
                if (!rawPublished && item.datePublished)
                    rawPublished = String(item.datePublished);
                if (!rawModified && item.dateModified)
                    rawModified = String(item.dateModified);
            }
        }
        catch { }
    });
    // Fallback to HTML5 <time> semantic tags or common classes
    if (!rawPublished) {
        rawPublished =
            $("time.entry-date.published").attr("datetime") ||
                $("time[datetime]").first().attr("datetime") ||
                $("time.entry-date").first().text().trim() ||
                $(".published, .post-date, .meta-date").first().text().trim() ||
                "";
    }
    if (!rawModified) {
        rawModified =
            $("time.updated").attr("datetime") ||
                $("time.modified").attr("datetime") ||
                "";
    }
    const publishedTime = formatDateTime(rawPublished);
    const modifiedTime = formatDateTime(rawModified);
    return {
        url,
        finalUrl,
        statusCode,
        contentType,
        crawlTimeMs,
        depth,
        title,
        metaDescription: metaDesc,
        h1: h1List,
        headings: {
            h2: h2List,
            h3: h3List,
            h4: h4List
        },
        metaRobots,
        canonical,
        wordCount,
        boldKeywords: Array.from(boldKeywordsSet),
        publishedTime,
        modifiedTime,
        isArticle,
        totalInternalLinks,
        totalExternalLinks,
        inlinks: [],
        outlinks,
        discoveryLinks,
        mainContentText: cleanMainText
    };
}
function formatDateTime(str) {
    if (!str)
        return "";
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const min = String(d.getMinutes()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
        }
    }
    catch { }
    return str.slice(0, 19).replace("T", " ");
}
