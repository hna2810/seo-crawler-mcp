"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRedirectOrCanonical = hasRedirectOrCanonical;
exports.performSEOAudit = performSEOAudit;
const text_1 = require("../utils/text");
/**
 * Kiểm tra xem trang có chuyển hướng hoặc có chỉ định Canonical trỏ về URL khác không.
 * Nếu trang đã có chuyển hướng (HTTP 3xx, Redirect sang URL đích khác, Soft 404)
 * hoặc có thẻ Canonical trỏ sang URL khác (Canonical redirect),
 * thì TUYỆT ĐỐI KHÔNG XÉT ĐẾN TRÙNG LẶP NỘI DUNG.
 */
function hasRedirectOrCanonical(page) {
    // 1. Soft 404 (redirect về trang chủ)
    if (page.isSoft404)
        return true;
    // 2. HTTP Redirect status (301, 302, 307, 308)
    if (page.statusCode >= 300 && page.statusCode < 400)
        return true;
    // 3. HTTP Redirect được follow bởi crawler (finalUrl khác URL ban đầu)
    if (page.finalUrl && page.url) {
        try {
            const u1 = new URL(page.url);
            const u2 = new URL(page.finalUrl);
            const p1 = (u1.hostname + u1.pathname + u1.search).replace(/\/+$/, "").toLowerCase();
            const p2 = (u2.hostname + u2.pathname + u2.search).replace(/\/+$/, "").toLowerCase();
            if (p1 !== p2)
                return true;
        }
        catch {
            if (page.url.replace(/\/+$/, "").toLowerCase() !== page.finalUrl.replace(/\/+$/, "").toLowerCase()) {
                return true;
            }
        }
    }
    // 4. Thẻ Canonical trỏ sang URL khác (Canonical pointer / Canonical redirect)
    if (page.canonical && page.canonical.trim() !== "") {
        try {
            const uTarget = new URL(page.canonical);
            const uCurr = new URL(page.url);
            const pTarget = (uTarget.hostname + uTarget.pathname).replace(/\/+$/, "").toLowerCase();
            const pCurr = (uCurr.hostname + uCurr.pathname).replace(/\/+$/, "").toLowerCase();
            if (pTarget !== pCurr) {
                if (page.finalUrl) {
                    const uFinal = new URL(page.finalUrl);
                    const pFinal = (uFinal.hostname + uFinal.pathname).replace(/\/+$/, "").toLowerCase();
                    if (pTarget !== pFinal)
                        return true;
                }
                else {
                    return true;
                }
            }
        }
        catch {
            const normCanonical = page.canonical.replace(/\/+$/, "").toLowerCase();
            const normUrl = page.url.replace(/\/+$/, "").toLowerCase();
            if (normCanonical !== normUrl)
                return true;
        }
    }
    // 5. Thẻ Meta Robots Noindex
    if (page.metaRobots && page.metaRobots.toLowerCase().includes("noindex")) {
        return true;
    }
    return false;
}
function performSEOAudit(pages) {
    const issues = [];
    const pageList = Object.values(pages);
    // Maps for duplicate checks
    const titleMap = new Map();
    // Summary counters
    let missingTitle = 0;
    let duplicateTitleCount = 0;
    let titleTooLong = 0;
    let urlTooLongCount = 0;
    let missingMetaDesc = 0;
    let missingH1Count = 0;
    let multipleH1Count = 0;
    let duplicateContentCount = 0;
    let count404 = 0;
    let count410 = 0;
    let countRedirects = 0;
    let countNoindex = 0;
    // 1. Single Page Checks
    for (const page of pageList) {
        // --- URL Length Check (<60 ký tự tốt, >60 ký tự cảnh báo) ---
        if (page.url.length > 60) {
            urlTooLongCount++;
            issues.push({
                url: page.url,
                category: "meta",
                severity: "warning",
                type: "URL_TOO_LONG",
                message: `Độ dài URL quá 60 ký tự (${page.url.length} ký tự > 60 ký tự khuyến nghị): "${page.url}"`,
                details: { length: page.url.length, url: page.url }
            });
        }
        // --- Status checks ---
        if (page.statusCode === 404 || page.isSoft404) {
            count404++;
            issues.push({
                url: page.url,
                category: "status",
                severity: "critical",
                type: "404_NOT_FOUND",
                message: page.isSoft404
                    ? `Trang lỗi 404 bị chuyển hướng (Redirect) về trang chủ do cài plugin (Soft 404)`
                    : `Trang trả về mã lỗi 404 (Not Found)`,
                details: { statusCode: 404, isSoft404: page.isSoft404 }
            });
        }
        else if (page.statusCode === 410) {
            count410++;
            issues.push({
                url: page.url,
                category: "status",
                severity: "critical",
                type: "410_GONE",
                message: `Trang trả về mã 410 (Gone - Đã xóa vĩnh viễn)`,
                details: { statusCode: 410 }
            });
        }
        else if (page.statusCode >= 300 && page.statusCode < 400) {
            countRedirects++;
            issues.push({
                url: page.url,
                category: "status",
                severity: "warning",
                type: "REDIRECT",
                message: `Trang bị chuyển hướng với mã ${page.statusCode} sang: ${page.finalUrl}`,
                details: { statusCode: page.statusCode, finalUrl: page.finalUrl }
            });
        }
        else if (page.statusCode >= 500) {
            issues.push({
                url: page.url,
                category: "status",
                severity: "critical",
                type: "SERVER_ERROR",
                message: `Lỗi máy chủ nội bộ (${page.statusCode})`,
                details: { statusCode: page.statusCode }
            });
        }
        // Skip content/meta checks for non-200 pages or soft 404
        if (page.statusCode !== 200 || page.isSoft404)
            continue;
        // --- Meta Title checks ---
        if (!page.title || page.title.trim() === "") {
            missingTitle++;
            issues.push({
                url: page.url,
                category: "meta",
                severity: "critical",
                type: "MISSING_TITLE",
                message: "Trang bị thiếu thẻ Title (<title>)"
            });
        }
        else {
            if (!hasRedirectOrCanonical(page)) {
                const cleanT = page.title.trim().toLowerCase();
                if (!titleMap.has(cleanT)) {
                    titleMap.set(cleanT, []);
                }
                titleMap.get(cleanT).push(page.url);
            }
            if (page.title.length > 60) {
                titleTooLong++;
                issues.push({
                    url: page.url,
                    category: "meta",
                    severity: "warning",
                    type: "TITLE_TOO_LONG",
                    message: `Title SEO quá dài (${page.title.length} ký tự > 60 ký tự khuyến nghị): "${page.title}"`,
                    details: { length: page.title.length, title: page.title }
                });
            }
        }
        // --- Meta Description checks ---
        if (!page.metaDescription || page.metaDescription.trim() === "") {
            missingMetaDesc++;
            issues.push({
                url: page.url,
                category: "meta",
                severity: "warning",
                type: "MISSING_META_DESCRIPTION",
                message: "Trang thiếu thẻ Meta Description"
            });
        }
        else if (page.metaDescription.length > 160) {
            issues.push({
                url: page.url,
                category: "meta",
                severity: "info",
                type: "META_DESCRIPTION_TOO_LONG",
                message: `Meta Description dài (${page.metaDescription.length} ký tự > 160 ký tự)`,
                details: { length: page.metaDescription.length }
            });
        }
        // --- Headings H1 checks ---
        if (!page.h1 || page.h1.length === 0) {
            missingH1Count++;
            issues.push({
                url: page.url,
                category: "meta",
                severity: "critical",
                type: "MISSING_H1",
                message: "Trang không có thẻ H1 (Heading 1)"
            });
        }
        else if (page.h1.length > 1) {
            multipleH1Count++;
            issues.push({
                url: page.url,
                category: "meta",
                severity: "warning",
                type: "MULTIPLE_H1",
                message: `Trang có nhiều thẻ H1 (${page.h1.length} thẻ H1)`,
                details: { count: page.h1.length, headings: page.h1 }
            });
        }
        // --- Indexing / Robots ---
        if (page.metaRobots && page.metaRobots.toLowerCase().includes("noindex")) {
            countNoindex++;
            issues.push({
                url: page.url,
                category: "indexing",
                severity: "warning",
                type: "NOINDEX_DETECTED",
                message: `Trang có chứa chỉ thị noindex: "${page.metaRobots}"`,
                details: { metaRobots: page.metaRobots }
            });
        }
        if (page.canonical && page.canonical !== page.url && page.canonical !== page.finalUrl) {
            issues.push({
                url: page.url,
                category: "indexing",
                severity: "info",
                type: "CANONICAL_MISMATCH",
                message: `Thẻ Canonical trỏ về URL khác: ${page.canonical}`,
                details: { canonical: page.canonical }
            });
        }
    }
    // 2. Cross-Page Duplicate Title Check
    for (const [titleText, urls] of titleMap.entries()) {
        if (urls.length > 1) {
            duplicateTitleCount += urls.length;
            for (const u of urls) {
                issues.push({
                    url: u,
                    category: "meta",
                    severity: "critical",
                    type: "DUPLICATE_TITLE",
                    message: `Tiêu đề trùng lặp với ${urls.length - 1} trang khác: "${titleText}"`,
                    details: { conflictingUrls: urls.filter(x => x !== u) }
                });
            }
        }
    }
    // 3. Fast Duplicate Content Check (Bucket by word count + fingerprint)
    // Quy tắc:
    // - Chỉ đánh giá bài viết (isArticle !== false)
    // - Status code 200
    // - Không phải Soft 404
    // - NẾU ĐÃ CÓ CHUYỂN HƯỚNG (HTTP redirect hoặc thẻ Canonical trỏ sang URL khác hoặc noindex) THÌ KHÔNG XÉT ĐẾN TRÙNG LẶP NỘI DUNG NỮA!
    // - Có nội dung >= 100 từ
    const validArticles = pageList.filter(p => p.statusCode === 200 &&
        !p.isSoft404 &&
        p.isArticle !== false &&
        !p.url.toLowerCase().includes("/collections/") &&
        !p.url.toLowerCase().includes("/category/") &&
        !p.url.toLowerCase().includes("/tag/") &&
        p.wordCount >= 100 &&
        !hasRedirectOrCanonical(p));
    const checkedPairs = new Set();
    // Group by word count bucket (bucket size: 25 words)
    const wordBuckets = new Map();
    for (const p of validArticles) {
        const bucket = Math.round(p.wordCount / 25) * 25;
        if (!wordBuckets.has(bucket)) {
            wordBuckets.set(bucket, []);
        }
        wordBuckets.get(bucket).push(p);
    }
    let totalPairChecks = 0;
    const MAX_PAIR_CHECKS = 1000;
    for (const [, bucketPages] of wordBuckets.entries()) {
        if (bucketPages.length < 2 || totalPairChecks >= MAX_PAIR_CHECKS)
            continue;
        for (let i = 0; i < bucketPages.length; i++) {
            for (let j = i + 1; j < bucketPages.length; j++) {
                if (totalPairChecks++ >= MAX_PAIR_CHECKS)
                    break;
                const p1 = bucketPages[i];
                const p2 = bucketPages[j];
                // Skip if same normalized URL
                const norm1 = p1.url.replace(/\/+$/, "").toLowerCase();
                const norm2 = p2.url.replace(/\/+$/, "").toLowerCase();
                if (norm1 === norm2)
                    continue;
                // Bỏ qua nếu một trong hai trang có chuyển hướng hoặc canonical trỏ sang trang kia
                const canon1 = (p1.canonical || "").replace(/\/+$/, "").toLowerCase();
                const canon2 = (p2.canonical || "").replace(/\/+$/, "").toLowerCase();
                if (canon1 === norm2 || canon2 === norm1)
                    continue;
                if (p1.finalUrl && p1.finalUrl.replace(/\/+$/, "").toLowerCase() === norm2)
                    continue;
                if (p2.finalUrl && p2.finalUrl.replace(/\/+$/, "").toLowerCase() === norm1)
                    continue;
                const pairKey = p1.url < p2.url ? `${p1.url}|${p2.url}` : `${p2.url}|${p1.url}`;
                if (checkedPairs.has(pairKey))
                    continue;
                checkedPairs.add(pairKey);
                const sim = (0, text_1.calculateJaccardSimilarity)(p1.mainContentText, p2.mainContentText, 3);
                if (sim >= 0.85) {
                    duplicateContentCount += 2;
                    issues.push({
                        url: p1.url,
                        category: "content",
                        severity: "critical",
                        type: "DUPLICATE_CONTENT",
                        message: `Nội dung trùng lặp (${(sim * 100).toFixed(1)}%) với: ${p2.url}`,
                        details: { duplicateWith: p2.url, similarity: sim }
                    });
                    issues.push({
                        url: p2.url,
                        category: "content",
                        severity: "critical",
                        type: "DUPLICATE_CONTENT",
                        message: `Nội dung trùng lặp (${(sim * 100).toFixed(1)}%) với: ${p1.url}`,
                        details: { duplicateWith: p1.url, similarity: sim }
                    });
                }
            }
        }
    }
    // 4. Broken Link Checks
    for (const page of pageList) {
        for (const out of page.outlinks) {
            if (!out.isExternal && pages[out.toUrl]) {
                const targetPage = pages[out.toUrl];
                if (targetPage.statusCode === 404 || targetPage.statusCode === 410 || targetPage.isSoft404) {
                    issues.push({
                        url: page.url,
                        category: "links",
                        severity: "critical",
                        type: "BROKEN_INTERNAL_LINK",
                        message: `Liên kết nội bộ hỏng trỏ đến trang ${targetPage.statusCode || 404}: ${out.toUrl} (Anchor: "${out.anchorText}")`,
                        details: { brokenTarget: out.toUrl, statusCode: targetPage.statusCode, anchorText: out.anchorText }
                    });
                }
            }
        }
    }
    // Grouping
    const issuesByCategory = {
        status: issues.filter(i => i.category === "status"),
        meta: issues.filter(i => i.category === "meta"),
        content: issues.filter(i => i.category === "content"),
        indexing: issues.filter(i => i.category === "indexing"),
        links: issues.filter(i => i.category === "links")
    };
    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;
    const infoCount = issues.filter(i => i.severity === "info").length;
    return {
        totalPages: pageList.length,
        totalIssues: issues.length,
        criticalCount,
        warningCount,
        infoCount,
        issuesByCategory,
        summary: {
            missingTitle,
            duplicateTitle: duplicateTitleCount,
            titleTooLong,
            urlTooLong: urlTooLongCount,
            missingMetaDescription: missingMetaDesc,
            missingH1: missingH1Count,
            multipleH1: multipleH1Count,
            duplicateContent: duplicateContentCount,
            statusCode404: count404,
            statusCode410: count410,
            redirects: countRedirects,
            noindex: countNoindex
        }
    };
}
