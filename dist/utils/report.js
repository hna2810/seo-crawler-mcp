"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateArticlesCSV = generateArticlesCSV;
exports.generateIssuesCSV = generateIssuesCSV;
exports.generateTopicsCSV = generateTopicsCSV;
exports.generateInternalLinksCSV = generateInternalLinksCSV;
exports.generateMarkdownReport = generateMarkdownReport;
exports.flattenSiteTreeForReport = flattenSiteTreeForReport;
exports.generateComprehensiveExcelWorkbook = generateComprehensiveExcelWorkbook;
const extractor_1 = require("../crawler/extractor");
const exceljs_1 = __importDefault(require("exceljs"));
// @ts-ignore
const chartsheet_1 = require("chartsheet");
function escapeCSV(val) {
    if (val === null || val === undefined)
        return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
}
function generateArticlesCSV(session, audit, classifications) {
    // Group issues by URL for easy lookup
    const issuesByUrl = {};
    const allIssues = [
        ...audit.issuesByCategory.status,
        ...audit.issuesByCategory.meta,
        ...audit.issuesByCategory.content,
        ...audit.issuesByCategory.indexing,
        ...audit.issuesByCategory.links
    ];
    for (const issue of allIssues) {
        if (!issuesByUrl[issue.url])
            issuesByUrl[issue.url] = [];
        issuesByUrl[issue.url].push(`[${issue.severity.toUpperCase()}] ${issue.type}`);
    }
    const classificationByUrl = new Map();
    for (const c of classifications) {
        classificationByUrl.set(c.url, c);
    }
    const headers = [
        "URL",
        "Final URL",
        "Mã trạng thái (Status)",
        "Độ dài URL",
        "Đánh giá URL (<60 ký tự)",
        "Ngày đăng bài",
        "Ngày cập nhật",
        "Tiêu đề (Title)",
        "Độ dài Title",
        "Thẻ H1 chính",
        "Meta Description",
        "Độ dài Meta Description",
        "Số từ (Word Count)",
        "Internal Links (Trong bài)",
        "External Links (Trong bài)",
        "Thẻ Canonical",
        "Chỉ thị Robots",
        "Topic chính (Mẹ & Bé)",
        "Subtopic",
        "Specific Topic",
        "Ý định / Định dạng (Context)",
        "Địa phương (Location)",
        "Từ khóa khớp",
        "Lỗi SEO phát hiện"
    ];
    const rows = [headers.map(escapeCSV).join(",")];
    for (const page of Object.values(session.pages)) {
        if (page.isArticle === false || page.url === session.rootUrl || (0, extractor_1.isNonArticleUrlOrTitle)(page.url, page.finalUrl, page.title))
            continue;
        const classif = classificationByUrl.get(page.url);
        const issues = issuesByUrl[page.url] || [];
        const urlEval = page.url.length <= 60 ? "Tốt (<=60 ký tự)" : "CẢNH BÁO (>60 ký tự)";
        const row = [
            page.url,
            page.finalUrl,
            page.statusCode,
            page.url.length,
            urlEval,
            page.publishedTime || "",
            page.modifiedTime || "",
            page.title,
            page.title ? page.title.length : 0,
            page.h1 && page.h1.length > 0 ? page.h1[0] : "",
            page.metaDescription,
            page.metaDescription ? page.metaDescription.length : 0,
            page.wordCount,
            page.totalInternalLinks,
            page.totalExternalLinks,
            page.canonical,
            page.metaRobots,
            classif ? classif.topic : "",
            classif ? classif.subtopic : "",
            classif && classif.specificTopic ? classif.specificTopic : "",
            classif && classif.context ? classif.context : "",
            classif && classif.location ? classif.location : "",
            classif && classif.matchedKeywords ? classif.matchedKeywords.join("; ") : "",
            issues.join("; ")
        ];
        rows.push(row.map(escapeCSV).join(","));
    }
    // Prefix with UTF-8 BOM so Excel opens Vietnamese characters cleanly
    return "\uFEFF" + rows.join("\r\n");
}
function generateIssuesCSV(session, audit) {
    const headers = [
        "URL",
        "Mức độ nghiêm trọng",
        "Mã loại lỗi (Type)",
        "Danh mục lỗi (Category)",
        "Chi tiết thông báo lỗi"
    ];
    const rows = [headers.map(escapeCSV).join(",")];
    const allIssues = [
        ...audit.issuesByCategory.status,
        ...audit.issuesByCategory.meta,
        ...audit.issuesByCategory.content,
        ...audit.issuesByCategory.indexing,
        ...audit.issuesByCategory.links
    ];
    for (const issue of allIssues) {
        const row = [
            issue.url,
            issue.severity.toUpperCase(),
            issue.type,
            issue.category,
            issue.message
        ];
        rows.push(row.map(escapeCSV).join(","));
    }
    return "\uFEFF" + rows.join("\r\n");
}
function generateTopicsCSV(session, contentRatio) {
    const headers = [
        "STT",
        "Topic chính",
        "Số bài Topic",
        "Tỷ trọng Topic (%)",
        "Subtopic",
        "Số bài Subtopic",
        "Tỷ trọng Subtopic (%)",
        "Chủ đề con chưa có bài (Content Gaps)"
    ];
    const rows = [headers.map(escapeCSV).join(",")];
    const gapsMap = {};
    for (const g of contentRatio.contentGaps) {
        gapsMap[g.topic] = g.subtopicsWithZeroArticles;
    }
    let index = 1;
    for (const t of contentRatio.topicDistributions) {
        const gaps = gapsMap[t.topic] ? gapsMap[t.topic].join("; ") : "";
        if (t.subtopics.length === 0) {
            rows.push([
                index++,
                t.topic,
                t.count,
                `${t.ratio}%`,
                "",
                0,
                "0%",
                gaps
            ].map(escapeCSV).join(","));
        }
        else {
            t.subtopics.forEach((s, sIdx) => {
                rows.push([
                    sIdx === 0 ? index++ : "",
                    sIdx === 0 ? t.topic : "",
                    sIdx === 0 ? t.count : "",
                    sIdx === 0 ? `${t.ratio}%` : "",
                    s.subtopic,
                    s.count,
                    `${s.ratio}%`,
                    sIdx === 0 ? gaps : ""
                ].map(escapeCSV).join(","));
            });
        }
    }
    return "\uFEFF" + rows.join("\r\n");
}
function generateInternalLinksCSV(session) {
    const headers = [
        "STT",
        "URL bài viết nguồn",
        "Title bài viết nguồn",
        "Anchor Text",
        "URL đích",
        "Title URL đích",
        "Status",
        "Loại link"
    ];
    const rows = [headers.map(escapeCSV).join(",")];
    const pageLookup = new Map();
    for (const page of Object.values(session.pages)) {
        pageLookup.set(page.url, page);
        pageLookup.set(page.finalUrl, page);
    }
    let index = 1;
    for (const page of Object.values(session.pages)) {
        if (page.isArticle === false || page.url === session.rootUrl || (0, extractor_1.isNonArticleUrlOrTitle)(page.url, page.finalUrl, page.title))
            continue;
        if (!page.outlinks || page.outlinks.length === 0)
            continue;
        for (const outlink of page.outlinks) {
            if (outlink.isExternal)
                continue;
            const destPage = pageLookup.get(outlink.toUrl);
            rows.push([
                index++,
                page.url,
                page.title || page.url,
                outlink.anchorText || "-",
                outlink.toUrl,
                destPage ? destPage.title : "-",
                destPage ? destPage.statusCode : 200,
                "Internal"
            ].map(escapeCSV).join(","));
        }
    }
    return "\uFEFF" + rows.join("\r\n");
}
function generateMarkdownReport(session, audit, structure, contentRatio, classifications) {
    const lines = [];
    lines.push(`# BÁO CÁO CRAWL WEBSITE & PHÂN TÍCH SEO - CHỦ ĐỀ NỘI DUNG`);
    lines.push(`> **Website**: \`${session.rootUrl}\``);
    lines.push(`> **Thời gian quét**: ${session.startTime} (Thời lượng: ${(session.durationMs / 1000).toFixed(1)}s)`);
    lines.push(`> **Tổng số URL đã quét**: ${Object.keys(session.pages).length} | **Số lỗi phát hiện**: ${audit.totalIssues} (Nghiêm trọng: ${audit.criticalCount}, Cảnh báo: ${audit.warningCount})`);
    lines.push("");
    // 1. TỔNG QUAN KẾT QUẢ SEO
    lines.push(`## 1. Phát hiện Lỗi SEO Kỹ thuật & On-page`);
    lines.push(`| Loại lỗi | Số lượng | Mức độ | Ghi chú |`);
    lines.push(`| :--- | :--- | :--- | :--- |`);
    lines.push(`| **404 Not Found** | ${audit.summary.statusCode404} | Critical | Link gãy hoặc trang không tồn tại |`);
    lines.push(`| **410 Gone** | ${audit.summary.statusCode410} | Critical | Trang đã bị xóa vĩnh viễn |`);
    lines.push(`| **301 / 302 Redirect** | ${audit.summary.redirects} | Warning | Trang bị chuyển hướng |`);
    lines.push(`| **Thiếu thẻ Title** | ${audit.summary.missingTitle} | Critical | Cần bổ sung ngay |`);
    lines.push(`| **Trùng lặp Title** | ${audit.summary.duplicateTitle} | Critical | Gây hiện tượng ăn thịt từ khóa (Cannibalization) |`);
    lines.push(`| **Title SEO quá dài (>60 ký tự)** | ${audit.summary.titleTooLong} | Warning | Bị Google cắt bớt trên SERP |`);
    lines.push(`| **Thiếu Meta Description** | ${audit.summary.missingMetaDescription} | Warning | Giảm tỷ lệ nhấp CTR |`);
    lines.push(`| **Thiếu thẻ H1** | ${audit.summary.missingH1} | Critical | Thiếu tiêu đề ngữ nghĩa chính |`);
    lines.push(`| **Nhiều thẻ H1** | ${audit.summary.multipleH1} | Warning | Mỗi trang chỉ nên có 1 H1 duy nhất |`);
    lines.push(`| **URL quá dài (>60 ký tự)** | ${audit.summary.urlTooLong} | Warning | URL dài vượt quá 60 ký tự khuyến nghị |`);
    lines.push(`| **Nội dung trùng lặp (Duplicate)** | ${audit.summary.duplicateContent} | Critical | Nguy cơ bị thuật toán phạt |`);
    lines.push(`| **Chỉ thị Noindex** | ${audit.summary.noindex} | Info | Ngăn chặn Google index trang |`);
    lines.push("");
    if (audit.criticalCount > 0) {
        lines.push(`### Danh sách URL gặp lỗi nghiêm trọng (Critical):`);
        const criticals = [
            ...audit.issuesByCategory.status.filter(i => i.severity === "critical"),
            ...audit.issuesByCategory.meta.filter(i => i.severity === "critical"),
            ...audit.issuesByCategory.content.filter(i => i.severity === "critical"),
            ...audit.issuesByCategory.links.filter(i => i.severity === "critical")
        ].slice(0, 20);
        for (const issue of criticals) {
            lines.push(`- **[${issue.type}]** \`${issue.url}\`: ${issue.message}`);
        }
        lines.push("");
    }
    // 2. CẤU TRÚC WEBSITE
    lines.push(`## 2. Phân tích Cấu trúc Phân cấp Website`);
    lines.push(`### Sơ đồ cấu trúc cây thư mục (Hierarchy Tree):`);
    lines.push("```text");
    lines.push(structure.asciiTree.trim());
    lines.push("```");
    lines.push("");
    lines.push(`### Phân bố Độ sâu URL (Depth Distribution):`);
    lines.push(`| Độ sâu (Depth) | Số lượng URL |`);
    lines.push(`| :--- | :--- |`);
    for (const [depth, count] of Object.entries(structure.depthDistribution)) {
        lines.push(`| Cấp độ ${depth} | ${count} trang |`);
    }
    lines.push("");
    if (structure.orphanPages.length > 0) {
        lines.push(`### Trang mồ côi (Orphan Pages - 0 Internal Links trỏ đến):`);
        lines.push(`*Có tổng cộng ${structure.orphanPages.length} trang mồ côi cần được gắn link nội bộ:*`);
        for (const p of structure.orphanPages.slice(0, 10)) {
            lines.push(`- \`${p.url}\` - *${p.title}*`);
        }
        lines.push("");
    }
    // 3. PHÂN LOẠI CHỦ ĐỀ NỘI DUNG MẸ & BÉ
    lines.push(`## 3. Báo cáo Phân loại & Tỷ trọng Nội dung (Taxonomy Mẹ & Bé)`);
    if (contentRatio.topTopic) {
        lines.push(`- **Chủ đề được viết nhiều nhất**: **${contentRatio.topTopic.topic}** (${contentRatio.topTopic.count} bài - chiếm **${contentRatio.topTopic.ratio}%**)`);
    }
    if (contentRatio.topSubtopic) {
        lines.push(`- **Chủ đề con viết nhiều nhất**: **${contentRatio.topSubtopic.subtopic}** (${contentRatio.topSubtopic.count} bài - chiếm **${contentRatio.topSubtopic.ratio}%**)`);
    }
    lines.push("");
    lines.push(`### Bảng Tỷ trọng Nội dung theo Topic:`);
    lines.push(`| STT | Topic chính | Số lượng bài | Tỷ trọng (%) | Subtopic tiêu biểu |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    contentRatio.topicDistributions.forEach((t, idx) => {
        const topSub = t.subtopics.length > 0 ? `${t.subtopics[0].subtopic} (${t.subtopics[0].count})` : "-";
        lines.push(`| ${idx + 1} | **${t.topic}** | ${t.count} | ${t.ratio}% | ${topSub} |`);
    });
    lines.push("");
    lines.push(`### Phân bổ theo Ý định / Định dạng (Content Context):`);
    lines.push(`| Context (Định dạng / Ý định) | Số bài viết | Tỷ lệ (%) |`);
    lines.push(`| :--- | :--- | :--- |`);
    for (const c of contentRatio.contextBreakdown) {
        lines.push(`| ${c.context} | ${c.count} | ${c.ratio}% |`);
    }
    lines.push("");
    lines.push(`### Phân bổ theo Địa phương (Location):`);
    lines.push(`| Địa phương (Location) | Số bài viết | Tỷ lệ (%) |`);
    lines.push(`| :--- | :--- | :--- |`);
    for (const l of contentRatio.locationBreakdown) {
        lines.push(`| ${l.location} | ${l.count} | ${l.ratio}% |`);
    }
    lines.push("");
    if (contentRatio.contentGaps.length > 0) {
        lines.push(`### Đề xuất Chủ đề Bỏ ngỏ (Content Gaps):`);
        for (const g of contentRatio.contentGaps.slice(0, 5)) {
            lines.push(`- **${g.topic}**: Còn trống các chủ đề con: *${g.subtopicsWithZeroArticles.slice(0, 4).join(", ")}...*`);
        }
        lines.push("");
    }
    lines.push(`### Chi tiết Phân loại các URL tiêu biểu:`);
    lines.push(`| URL / Tiêu đề | Topic | Subtopic | Specific Topic | Context | Location | Confidence |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    for (const item of classifications.slice(0, 15)) {
        const displayTitle = item.title ? item.title.slice(0, 40) + "..." : item.url;
        lines.push(`| [${displayTitle}](${item.url}) | ${item.topic} | ${item.subtopic} | ${item.specificTopic || "-"} | ${item.context || "-"} | ${item.location || "-"} | ${(item.confidence * 100).toFixed(0)}% |`);
    }
    return lines.join("\n");
}
function flattenSiteTreeForReport(node, totalPages, prefix = "", isLast = true, result = []) {
    const isRoot = node.depth === 0;
    let displayName = "";
    if (isRoot) {
        displayName = `🌐 [Trang Chủ] ${node.url}`;
    }
    else {
        const branch = isLast ? "└── " : "├── ";
        const hasChildren = Object.keys(node.children).length > 0;
        const icon = hasChildren ? "📁 " : "📄 ";
        displayName = `${prefix}${branch}${icon}${node.segment}`;
    }
    const ratio = totalPages > 0 ? Number(((node.pageCount / totalPages) * 100).toFixed(1)) : 0;
    result.push({
        depth: node.depth,
        displayName,
        path: node.path || "/",
        pageCount: node.pageCount,
        ratio,
        title: node.title || (isRoot ? "Homepage" : "-")
    });
    const children = Object.values(node.children);
    const nextPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < children.length; i++) {
        flattenSiteTreeForReport(children[i], totalPages, nextPrefix, i === children.length - 1, result);
    }
    return result;
}
async function generateComprehensiveExcelWorkbook(session, audit, structure, contentRatio, classifications) {
    const wb = new exceljs_1.default.Workbook();
    wb.creator = "SEO Crawler & Mother-Baby Content Classifier";
    wb.created = new Date();
    const NAVY = "FF1E293B";
    const BLUE = "FF2563EB";
    const LIGHT_BLUE = "FFEFF6FF";
    const EMERALD = "FF059669";
    const LIGHT_EMERALD = "FFECFDF5";
    const RED = "FFDC2626";
    const LIGHT_RED = "FFFEF2F2";
    const AMBER = "FFD97706";
    const LIGHT_AMBER = "FFFFFBEB";
    const PURPLE = "FF7C3AED";
    const LIGHT_PURPLE = "FFFAF5FF";
    const BORDER_COLOR = "FFE2E8F0";
    const thinBorder = {
        top: { style: "thin", color: { argb: BORDER_COLOR } },
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } }
    };
    const totalPages = Object.keys(session.pages).length;
    // ----------------------------------------------------
    // SHEET 1: 1. Tổng Quan (Executive Dashboard)
    // ----------------------------------------------------
    const ws1 = wb.addWorksheet("1. Tổng Quan", {
        properties: { tabColor: { argb: BLUE } },
        views: [{ showGridLines: true }]
    });
    ws1.mergeCells("A1:K1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = "BÁO CÁO TOÀN DIỆN SEO & PHÂN BỔ CHỦ ĐỀ MẸ & BÉ";
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(1).height = 36;
    ws1.mergeCells("A2:K2");
    const subCell = ws1.getCell("A2");
    subCell.value = `Website: ${session.rootUrl}   |   Thời gian quét: ${session.startTime}   |   Tổng URL đã quét: ${totalPages} trang   |   Tổng lỗi phát hiện: ${audit.totalIssues} lỗi`;
    subCell.font = { name: "Segoe UI", size: 10, color: { argb: "FFCBD5E1" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(2).height = 24;
    ws1.getRow(4).height = 18;
    ws1.getRow(5).height = 26;
    function setKpiCard(col1, col2, label, val, bg, textCol) {
        ws1.mergeCells(`${col1}4:${col2}4`);
        ws1.mergeCells(`${col1}5:${col2}5`);
        const lCell = ws1.getCell(`${col1}4`);
        lCell.value = label;
        lCell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF64748B" } };
        lCell.alignment = { vertical: "bottom", horizontal: "center" };
        lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        const vCell = ws1.getCell(`${col1}5`);
        vCell.value = val;
        vCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: textCol } };
        vCell.alignment = { vertical: "middle", horizontal: "center" };
        vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        for (const c of [col1, col2]) {
            for (const r of [4, 5]) {
                ws1.getCell(`${c}${r}`).border = thinBorder;
            }
        }
    }
    setKpiCard("A", "B", "TỔNG SỐ TRANG CÀO", totalPages, LIGHT_BLUE, BLUE);
    setKpiCard("C", "D", "LỖI NGHIÊM TRỌNG", audit.criticalCount, LIGHT_RED, RED);
    setKpiCard("E", "F", "CẢNH BÁO TỐI ƯU", audit.warningCount, LIGHT_AMBER, AMBER);
    const topTopicDisplay = contentRatio.topTopic ? `${contentRatio.topTopic.topic} (${contentRatio.topTopic.ratio}%)` : "N/A";
    setKpiCard("G", "I", "TOPIC VIẾT NHIỀU NHẤT", topTopicDisplay, LIGHT_EMERALD, EMERALD);
    setKpiCard("J", "K", "TRANG MỒ CÔI (0 LINK)", structure.orphanPages.length, LIGHT_PURPLE, PURPLE);
    // Section 1: Topic distribution table
    ws1.getCell("A7").value = "TỶ TRỌNG 12 CHỦ ĐỀ CHÍNH";
    ws1.getCell("A7").font = { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY } };
    ws1.getCell("A8").value = "Topic Chính";
    ws1.getCell("B8").value = "Số Bài Viết";
    ws1.getRow(8).height = 22;
    [ws1.getCell("A8"), ws1.getCell("B8")].forEach(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const topicsDist = contentRatio.topicDistributions;
    const topicRowStart = 9;
    topicsDist.forEach((t, idx) => {
        const row = ws1.getRow(topicRowStart + idx);
        row.height = 19;
        const cA = row.getCell(1);
        const cB = row.getCell(2);
        cA.value = t.topic;
        cB.value = t.count;
        [cA, cB].forEach(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
        cB.alignment = { vertical: "middle", horizontal: "right" };
    });
    const topicEndRow = topicRowStart + topicsDist.length - 1;
    // Section 2: SEO Issues Table
    const seoSectionStartRow = topicEndRow + 3;
    ws1.getCell(`A${seoSectionStartRow}`).value = "THỐNG KÊ LỖI SEO KỸ THUẬT & ON-PAGE";
    ws1.getCell(`A${seoSectionStartRow}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY } };
    const seoHeaderRow = seoSectionStartRow + 1;
    ws1.getCell(`A${seoHeaderRow}`).value = "Loại Lỗi SEO";
    ws1.getCell(`B${seoHeaderRow}`).value = "Số Lượng Phát Hiện";
    ws1.getRow(seoHeaderRow).height = 22;
    [ws1.getCell(`A${seoHeaderRow}`), ws1.getCell(`B${seoHeaderRow}`)].forEach(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const seoErrorItems = [
        { name: "404 Not Found", count: audit.summary.statusCode404 },
        { name: "Redirects (301/302)", count: audit.summary.redirects },
        { name: "Thiếu thẻ Title", count: audit.summary.missingTitle },
        { name: "Trùng lặp Title", count: audit.summary.duplicateTitle },
        { name: "Title > 60 ký tự", count: audit.summary.titleTooLong },
        { name: "URL > 60 ký tự", count: audit.summary.urlTooLong },
        { name: "Thiếu Meta Description", count: audit.summary.missingMetaDescription },
        { name: "Thiếu thẻ H1", count: audit.summary.missingH1 },
        { name: "Nhiều hơn 1 thẻ H1", count: audit.summary.multipleH1 },
        { name: "Nội dung trùng lặp", count: audit.summary.duplicateContent },
        { name: "Trang mồ côi (0 inlinks)", count: structure.orphanPages.length }
    ];
    const seoRowStart = seoHeaderRow + 1;
    seoErrorItems.forEach((item, idx) => {
        const row = ws1.getRow(seoRowStart + idx);
        row.height = 19;
        const cA = row.getCell(1);
        const cB = row.getCell(2);
        cA.value = item.name;
        cB.value = item.count;
        [cA, cB].forEach(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
        cB.alignment = { vertical: "middle", horizontal: "right" };
    });
    const seoEndRow = seoRowStart + seoErrorItems.length - 1;
    ws1.getColumn(1).width = 30;
    ws1.getColumn(2).width = 20;
    for (let col = 3; col <= 12; col++) {
        ws1.getColumn(col).width = 13;
    }
    // ----------------------------------------------------
    // SHEET 2: 2. Tỷ Trọng Topic (Taxonomy & Gaps)
    // ----------------------------------------------------
    const ws2 = wb.addWorksheet("2. Tỷ Trọng Topic", {
        properties: { tabColor: { argb: EMERALD } },
        views: [{ showGridLines: true }]
    });
    ws2.mergeCells("A1:H1");
    const s2Title = ws2.getCell("A1");
    s2Title.value = "BẢNG PHÂN BỔ TỶ TRỌNG 12 TOPIC MẸ & BÉ & ĐỀ XUẤT CONTENT GAPS";
    s2Title.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    s2Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    s2Title.alignment = { vertical: "middle", horizontal: "center" };
    ws2.getRow(1).height = 32;
    const s2Headers = [
        "STT",
        "Topic Chính",
        "Số Bài Viết",
        "Tỷ Trọng (%)",
        "Subtopic Nổi Bật",
        "Số Bài Subtopic",
        "Tỷ Trọng Subtopic (%)",
        "Chủ Đề Con Chưa Có Bài (Content Gaps)"
    ];
    const s2HRow = ws2.getRow(3);
    s2HRow.height = 24;
    s2Headers.forEach((h, idx) => {
        const c = s2HRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const gapsMap = {};
    for (const g of contentRatio.contentGaps) {
        gapsMap[g.topic] = g.subtopicsWithZeroArticles;
    }
    let s2RowIdx = 4;
    let tIndex = 1;
    topicsDist.forEach(t => {
        const gaps = gapsMap[t.topic] ? gapsMap[t.topic].join("; ") : "";
        if (t.subtopics.length === 0) {
            const r = ws2.getRow(s2RowIdx++);
            r.values = [tIndex++, t.topic, t.count, Number((t.ratio / 100).toFixed(3)), "", 0, 0, gaps];
            r.height = 20;
            r.eachCell(c => { c.font = { name: "Segoe UI", size: 9 }; c.border = thinBorder; });
            r.getCell(4).numFmt = "0.0%";
            r.getCell(7).numFmt = "0.0%";
        }
        else {
            t.subtopics.forEach((s, sIdx) => {
                const r = ws2.getRow(s2RowIdx++);
                r.values = [
                    sIdx === 0 ? tIndex++ : "",
                    sIdx === 0 ? t.topic : "",
                    sIdx === 0 ? t.count : "",
                    sIdx === 0 ? Number((t.ratio / 100).toFixed(3)) : "",
                    s.subtopic,
                    s.count,
                    Number((s.ratio / 100).toFixed(3)),
                    sIdx === 0 ? gaps : ""
                ];
                r.height = 20;
                r.eachCell(c => { c.font = { name: "Segoe UI", size: 9 }; c.border = thinBorder; });
                if (sIdx === 0)
                    r.getCell(4).numFmt = "0.0%";
                r.getCell(7).numFmt = "0.0%";
            });
        }
    });
    // Top 10 Subtopics table on J3:K13
    ws2.getCell("J2").value = "TOP 10 SUBTOPIC VIẾT NHIỀU NHẤT";
    ws2.getCell("J2").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
    ws2.getCell("J3").value = "Subtopic";
    ws2.getCell("K3").value = "Số Lượng Bài";
    [ws2.getCell("J3"), ws2.getCell("K3")].forEach(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const allSubtopics = [];
    topicsDist.forEach(t => {
        t.subtopics.forEach(s => allSubtopics.push({ subtopic: s.subtopic, count: s.count }));
    });
    allSubtopics.sort((a, b) => b.count - a.count);
    const top10Subs = allSubtopics.slice(0, 10);
    top10Subs.forEach((s, idx) => {
        const row = ws2.getRow(4 + idx);
        row.getCell(10).value = s.subtopic;
        row.getCell(11).value = s.count;
        [row.getCell(10), row.getCell(11)].forEach(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        });
        row.getCell(11).alignment = { vertical: "middle", horizontal: "right" };
    });
    ws2.getColumn(1).width = 6;
    ws2.getColumn(2).width = 28;
    ws2.getColumn(3).width = 14;
    ws2.getColumn(4).width = 14;
    ws2.getColumn(5).width = 26;
    ws2.getColumn(6).width = 16;
    ws2.getColumn(7).width = 18;
    ws2.getColumn(8).width = 45;
    ws2.getColumn(9).width = 4;
    ws2.getColumn(10).width = 28;
    ws2.getColumn(11).width = 16;
    // ----------------------------------------------------
    // SHEET 3: 3. Báo Cáo Lỗi SEO (Issues Audit)
    // ----------------------------------------------------
    const ws3 = wb.addWorksheet("3. Báo Cáo Lỗi SEO", {
        properties: { tabColor: { argb: RED } },
        views: [{ showGridLines: true, state: "frozen", ySplit: 2 }]
    });
    ws3.mergeCells("A1:E1");
    const s3Title = ws3.getCell("A1");
    s3Title.value = "DANH SÁCH CHI TIẾT TOÀN BỘ CÁC LỖI SEO ON-PAGE & KỸ THUẬT PHÁT HIỆN";
    s3Title.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    s3Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
    s3Title.alignment = { vertical: "middle", horizontal: "center" };
    ws3.getRow(1).height = 32;
    const s3Headers = [
        "Mức Độ (Severity)",
        "Mã Loại Lỗi (Type)",
        "Danh Mục Lỗi (Category)",
        "URL Gặp Lỗi",
        "Chi Tiết Thông Báo Lỗi & Hướng Khắc Phục"
    ];
    const s3HRow = ws3.getRow(2);
    s3HRow.height = 24;
    s3Headers.forEach((h, idx) => {
        const c = s3HRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const allIssues = [
        ...audit.issuesByCategory.status,
        ...audit.issuesByCategory.meta,
        ...audit.issuesByCategory.content,
        ...audit.issuesByCategory.indexing,
        ...audit.issuesByCategory.links
    ];
    allIssues.forEach((issue, idx) => {
        const row = ws3.getRow(3 + idx);
        row.height = 20;
        const cSev = row.getCell(1);
        const cType = row.getCell(2);
        const cCat = row.getCell(3);
        const cUrl = row.getCell(4);
        const cMsg = row.getCell(5);
        cSev.value = issue.severity.toUpperCase();
        cType.value = issue.type;
        cCat.value = issue.category;
        cUrl.value = issue.url;
        cMsg.value = issue.message;
        [cSev, cType, cCat, cUrl, cMsg].forEach(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
        });
        if (issue.severity === "critical") {
            cSev.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
            cSev.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF991B1B" } };
        }
        else {
            cSev.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            cSev.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF92400E" } };
        }
        cSev.alignment = { vertical: "middle", horizontal: "center" };
        cType.font = { name: "Consolas", size: 9, bold: true };
    });
    ws3.autoFilter = "A2:E2";
    ws3.getColumn(1).width = 18;
    ws3.getColumn(2).width = 24;
    ws3.getColumn(3).width = 18;
    ws3.getColumn(4).width = 50;
    ws3.getColumn(5).width = 65;
    // ----------------------------------------------------
    // SHEET 4: 4. Toàn Bộ Bài Viết (Full 22 Columns)
    // ----------------------------------------------------
    const ws4 = wb.addWorksheet("4. Toàn Bộ Bài Viết", {
        properties: { tabColor: { argb: "FF1D4ED8" } },
        views: [{ showGridLines: true, state: "frozen", xSplit: 2, ySplit: 2 }]
    });
    ws4.mergeCells("A1:X1");
    const s4Title = ws4.getCell("A1");
    s4Title.value = "DANH SÁCH TOÀN BỘ BÀI VIẾT ĐÃ CÀO & PHÂN LOẠI ĐA CHIỀU (24 CỘT DỮ LIỆU)";
    s4Title.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    s4Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    s4Title.alignment = { vertical: "middle", horizontal: "center" };
    ws4.getRow(1).height = 32;
    const s4Headers = [
        "URL",
        "Final URL",
        "Mã Trạng Thái",
        "Độ Dài URL",
        "Đánh Giá URL (<60 ký tự)",
        "Ngày Đăng Bài",
        "Ngày Cập Nhật",
        "Tiêu Đề (Title)",
        "Độ Dài Title",
        "Thẻ H1 Chính",
        "Meta Description",
        "Độ Dài Meta Desc",
        "Số Từ",
        "Internal Links (Trong bài)",
        "External Links (Trong bài)",
        "Thẻ Canonical",
        "Chỉ Thị Robots",
        "Topic Chính (Mẹ & Bé)",
        "Subtopic",
        "Specific Topic",
        "Context (Ý Định)",
        "Location (Địa Phương)",
        "Từ Khóa Khớp",
        "Lỗi SEO Phát Hiện"
    ];
    const s4HRow = ws4.getRow(2);
    s4HRow.height = 24;
    s4Headers.forEach((h, idx) => {
        const c = s4HRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const classifMap = new Map();
    classifications.forEach(c => classifMap.set(c.url, c));
    const issuesByUrl = {};
    allIssues.forEach(i => {
        if (!issuesByUrl[i.url])
            issuesByUrl[i.url] = [];
        issuesByUrl[i.url].push(`[${i.severity.toUpperCase()}] ${i.type}`);
    });
    let s4RowIdx = 3;
    Object.values(session.pages).forEach((p, pIdx) => {
        if (p.isArticle === false || p.url === session.rootUrl || (0, extractor_1.isNonArticleUrlOrTitle)(p.url, p.finalUrl, p.title))
            return;
        const cl = classifMap.get(p.url);
        const iss = issuesByUrl[p.url] || [];
        const isUrlTooLong = p.url.length > 60;
        const urlEval = isUrlTooLong ? "CẢNH BÁO (>60)" : "Tốt (<=60)";
        const r = ws4.getRow(s4RowIdx++);
        r.height = 20;
        r.values = [
            p.url,
            p.finalUrl,
            p.statusCode,
            p.url.length,
            urlEval,
            p.publishedTime || "",
            p.modifiedTime || "",
            p.title,
            p.title ? p.title.length : 0,
            p.h1 && p.h1.length > 0 ? p.h1[0] : "",
            p.metaDescription,
            p.metaDescription ? p.metaDescription.length : 0,
            p.wordCount,
            p.totalInternalLinks,
            p.totalExternalLinks,
            p.canonical,
            p.metaRobots,
            cl ? cl.topic : "",
            cl ? cl.subtopic : "",
            cl && cl.specificTopic ? cl.specificTopic : "",
            cl && cl.context ? cl.context : "",
            cl && cl.location ? cl.location : "",
            cl && cl.matchedKeywords ? cl.matchedKeywords.join("; ") : "",
            iss.join("; ")
        ];
        r.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (pIdx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
        r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
        if (isUrlTooLong) {
            r.getCell(5).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } };
            r.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        }
        else {
            r.getCell(5).font = { name: "Segoe UI", size: 9, color: { argb: "FF059669" } };
        }
        r.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(7).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(13).numFmt = "#,##0";
    });
    ws4.autoFilter = "A2:X2";
    ws4.getColumn(1).width = 45;
    ws4.getColumn(2).width = 35;
    ws4.getColumn(3).width = 12;
    ws4.getColumn(4).width = 12;
    ws4.getColumn(5).width = 22;
    ws4.getColumn(6).width = 18;
    ws4.getColumn(7).width = 18;
    ws4.getColumn(8).width = 40;
    ws4.getColumn(9).width = 12;
    ws4.getColumn(10).width = 35;
    ws4.getColumn(11).width = 40;
    ws4.getColumn(12).width = 14;
    ws4.getColumn(13).width = 12;
    ws4.getColumn(14).width = 20;
    ws4.getColumn(15).width = 20;
    ws4.getColumn(16).width = 30;
    ws4.getColumn(17).width = 16;
    ws4.getColumn(18).width = 24;
    ws4.getColumn(19).width = 22;
    ws4.getColumn(20).width = 20;
    ws4.getColumn(21).width = 16;
    ws4.getColumn(22).width = 16;
    ws4.getColumn(23).width = 30;
    ws4.getColumn(24).width = 35;
    // ----------------------------------------------------
    // SHEET 5: 5. Liên Kết Nội Bộ (Internal Links Audit)
    // ----------------------------------------------------
    const ws5 = wb.addWorksheet("5. Liên Kết Nội Bộ", {
        properties: { tabColor: { argb: "FFF59E0B" } },
        views: [{ showGridLines: true, state: "frozen", ySplit: 2 }]
    });
    ws5.mergeCells("A1:H1");
    const s5Title = ws5.getCell("A1");
    s5Title.value = "DANH SÁCH LIÊN KẾT NỘI BỘ (INTERNAL LINKS) TỪ BÀI VIẾT & THỐNG KÊ ANCHOR TEXT";
    s5Title.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    s5Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } };
    s5Title.alignment = { vertical: "middle", horizontal: "center" };
    ws5.getRow(1).height = 32;
    // Table 1 Headers
    const s5Headers = [
        "STT",
        "URL bài viết nguồn",
        "Title bài viết nguồn",
        "Anchor Text",
        "URL đích",
        "Title URL đích",
        "Status",
        "Loại link"
    ];
    const s5HRow = ws5.getRow(2);
    s5HRow.height = 24;
    s5Headers.forEach((h, idx) => {
        const c = s5HRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF78350F" } };
        c.alignment = { vertical: "middle", horizontal: idx === 0 || idx >= 6 ? "center" : "left" };
        c.border = thinBorder;
    });
    // Map for destination URL lookup
    const pageLookup = new Map();
    for (const page of Object.values(session.pages)) {
        pageLookup.set(page.url, page);
        pageLookup.set(page.finalUrl, page);
        try {
            const u = new URL(page.url);
            const cleanP = u.origin + u.pathname.replace(/\/+$/, "");
            pageLookup.set(cleanP, page);
            pageLookup.set(cleanP + "/", page);
        }
        catch { }
    }
    const internalLinksList = [];
    const anchorCountMap = {};
    for (const page of Object.values(session.pages)) {
        // Only articles (exclude utility pages, archives, login, and root homepage)
        if (page.isArticle === false || page.url === session.rootUrl || (0, extractor_1.isNonArticleUrlOrTitle)(page.url, page.finalUrl, page.title))
            continue;
        if (!page.outlinks || page.outlinks.length === 0)
            continue;
        for (const outlink of page.outlinks) {
            if (outlink.isExternal)
                continue;
            const anchor = (outlink.anchorText || "").trim() || "(Không có anchor text)";
            let destPage = pageLookup.get(outlink.toUrl);
            if (!destPage) {
                try {
                    const u = new URL(outlink.toUrl);
                    const cleanP = u.origin + u.pathname.replace(/\/+$/, "");
                    destPage = pageLookup.get(cleanP) || pageLookup.get(cleanP + "/");
                }
                catch { }
            }
            const targetTitle = destPage?.title || "-";
            const statusCode = destPage?.statusCode || 200;
            internalLinksList.push({
                sourceUrl: page.url,
                sourceTitle: page.title || page.url,
                anchorText: anchor,
                targetUrl: outlink.toUrl,
                targetTitle,
                statusCode,
                linkType: "Internal"
            });
            anchorCountMap[anchor] = (anchorCountMap[anchor] || 0) + 1;
        }
    }
    let s5RowIdx = 3;
    internalLinksList.forEach((link, idx) => {
        const r = ws5.getRow(s5RowIdx++);
        r.height = 20;
        r.values = [
            idx + 1,
            link.sourceUrl,
            link.sourceTitle,
            link.anchorText,
            link.targetUrl,
            link.targetTitle,
            link.statusCode,
            link.linkType
        ];
        r.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDFBF7" } };
        });
        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(7).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(8).alignment = { vertical: "middle", horizontal: "center" };
        if (link.statusCode >= 400) {
            r.getCell(7).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: RED } };
        }
        else if (link.statusCode >= 300) {
            r.getCell(7).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: AMBER } };
        }
    });
    const table1EndRow = s5RowIdx;
    // Table 2: Anchor text statistics
    const t2TitleRow = table1EndRow + 2;
    ws5.getCell(`A${t2TitleRow}`).value = "Thống kê Anchor Text toàn website";
    ws5.getCell(`A${t2TitleRow}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: NAVY } };
    ws5.getCell(`A${t2TitleRow + 1}`).value = "--> Mục đích: biết anchor text nào được sử dụng nhiều nhất trên toàn bộ website.";
    ws5.getCell(`A${t2TitleRow + 1}`).font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } };
    const t2HeaderRow = t2TitleRow + 2;
    ws5.getRow(t2HeaderRow).height = 22;
    ["Anchor Text", "Số lần sử dụng", "Tỷ lệ"].forEach((h, idx) => {
        const c = ws5.getCell(t2HeaderRow, idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF78350F" } };
        c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "right" };
        c.border = thinBorder;
    });
    const totalInternalLinks = internalLinksList.length;
    const sortedAnchors = Object.entries(anchorCountMap).sort((a, b) => b[1] - a[1]);
    let t2DataRow = t2HeaderRow + 1;
    sortedAnchors.forEach(([anchor, count], idx) => {
        const r = ws5.getRow(t2DataRow++);
        r.height = 19;
        const ratio = totalInternalLinks > 0 ? count / totalInternalLinks : 0;
        r.getCell(1).value = anchor;
        r.getCell(2).value = count;
        r.getCell(3).value = ratio;
        [r.getCell(1), r.getCell(2), r.getCell(3)].forEach(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDFBF7" } };
        });
        r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(2).numFmt = "#,##0";
        r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(3).numFmt = "0.00%";
    });
    ws5.autoFilter = "A2:H2";
    ws5.getColumn(1).width = 28;
    ws5.getColumn(2).width = 45;
    ws5.getColumn(3).width = 35;
    ws5.getColumn(4).width = 28;
    ws5.getColumn(5).width = 45;
    ws5.getColumn(6).width = 35;
    ws5.getColumn(7).width = 12;
    ws5.getColumn(8).width = 14;
    // ----------------------------------------------------
    // SHEET 6: 6. Cấu Trúc Website (Hierarchy & Inlinks)
    // ----------------------------------------------------
    const ws6 = wb.addWorksheet("6. Cấu Trúc Website", {
        properties: { tabColor: { argb: PURPLE } },
        views: [{ showGridLines: true }]
    });
    ws6.mergeCells("A1:F1");
    const s6Title = ws6.getCell("A1");
    s6Title.value = "PHÂN TÍCH CẤU TRÚC PHÂN CẤP THƯ MỤC WEBSITE & ĐỒ THỊ LIÊN KẾT (SITE HIERARCHY)";
    s6Title.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    s6Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B21B6" } };
    s6Title.alignment = { vertical: "middle", horizontal: "center" };
    ws6.getRow(1).height = 32;
    // Section 1: Site Hierarchy Tree Diagram Table
    ws6.getCell("A3").value = "1. SƠ ĐỒ CẤU TRÚC PHÂN CẤP THƯ MỤC (SITE HIERARCHY TREE)";
    ws6.getCell("A3").font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF5B21B6" } };
    const s6TreeHRow = ws6.getRow(4);
    s6TreeHRow.height = 24;
    [
        "Cấp Độ (Depth)",
        "Sơ Đồ Phân Cấp Thư Mục / Cấu Trúc Cây (Site Tree)",
        "Đường Dẫn URL / Thư Mục (Path)",
        "Số Trang Thuộc Nhánh",
        "Tỷ Trọng (%)",
        "Tiêu Đề Trang Đại Diện"
    ].forEach((h, idx) => {
        const c = s6TreeHRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const flatTree = flattenSiteTreeForReport(structure.tree, totalPages);
    let s6RowIdx = 5;
    flatTree.forEach((node, idx) => {
        const r = ws6.getRow(s6RowIdx++);
        r.height = 20;
        r.values = [
            node.depth === 0 ? "Gốc (Level 0)" : `Cấp ${node.depth}`,
            node.displayName,
            node.path,
            node.pageCount,
            node.ratio / 100,
            node.title
        ];
        r.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (node.depth === 0) {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
                c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF4C1D95" } };
            }
            else if (node.depth === 1) {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
                c.font = { name: "Segoe UI", size: 9, bold: true };
            }
            else if (idx % 2 === 1) {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
        });
        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(4).numFmt = "#,##0";
        r.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(5).numFmt = "0.0%";
    });
    const treeEndRow = s6RowIdx;
    // Section 2: URL Depth Distribution
    const depthStartRow = treeEndRow + 2;
    ws6.getCell(`A${depthStartRow}`).value = "2. PHÂN BỐ ĐỘ SÂU URL (DEPTH DISTRIBUTION)";
    ws6.getCell(`A${depthStartRow}`).font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: BLUE } };
    const s6DepthHRow = ws6.getRow(depthStartRow + 1);
    s6DepthHRow.height = 22;
    [
        "Độ Sâu (Depth Level)",
        "Số Lượng URL",
        "Tỷ Trọng (%)",
        "Đánh Giá Cấu Trúc SEO"
    ].forEach((h, idx) => {
        const c = s6DepthHRow.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    let curDepthRow = depthStartRow + 2;
    const sortedDepths = Object.keys(structure.depthDistribution).map(Number).sort((a, b) => a - b);
    sortedDepths.forEach(depth => {
        const count = structure.depthDistribution[depth] || 0;
        const ratio = totalPages > 0 ? count / totalPages : 0;
        const evalText = depth <= 3 ? "Tốt (Thuận lợi cho bot Google cào và index)" : "Cảnh báo (URL quá sâu > 3 cấp, bot khó tìm)";
        const r = ws6.getRow(curDepthRow++);
        r.height = 19;
        r.values = [
            depth === 0 ? "Cấp 0 (Trang chủ)" : `Cấp độ ${depth}`,
            count,
            ratio,
            evalText
        ];
        r.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
        });
        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(2).numFmt = "#,##0";
        r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(3).numFmt = "0.0%";
        if (depth > 3) {
            r.getCell(4).font = { name: "Segoe UI", size: 9, color: { argb: "FFD97706" }, bold: true };
        }
        else {
            r.getCell(4).font = { name: "Segoe UI", size: 9, color: { argb: "FF059669" } };
        }
    });
    const depthEndRow = curDepthRow;
    // Section 3: Orphan pages
    const orphanStartRow = depthEndRow + 2;
    ws6.getCell(`A${orphanStartRow}`).value = `3. DANH SÁCH TRANG MỒ CÔI (ORPHAN PAGES - 0 INLINKS): ${structure.orphanPages.length} TRANG`;
    ws6.getCell(`A${orphanStartRow}`).font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: RED } };
    const s6H1Row = ws6.getRow(orphanStartRow + 1);
    s6H1Row.height = 22;
    ["STT", "URL Trang Mồ Côi", "Tiêu Đề Trang", "Độ Sâu (Depth)"].forEach((h, idx) => {
        const c = s6H1Row.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const s6OrphanStart = orphanStartRow + 2;
    structure.orphanPages.forEach((p, idx) => {
        const row = ws6.getRow(s6OrphanStart + idx);
        row.height = 19;
        row.values = [idx + 1, p.url, p.title || p.url, p.depth];
        row.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        });
        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
    });
    const orphanEndRow = s6OrphanStart + structure.orphanPages.length;
    // Section 4: Top linked pages
    const topLinkStart = orphanEndRow + 2;
    ws6.getCell(`A${topLinkStart}`).value = "4. TOP 25 TRANG NHẬN NHIỀU LIÊN KẾT NỘI BỘ NHẤT (AUTHORITY HUBS)";
    ws6.getCell(`A${topLinkStart}`).font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: BLUE } };
    const s6H2Row = ws6.getRow(topLinkStart + 1);
    s6H2Row.height = 22;
    ["Thứ Hạng", "URL Nhận Link", "Tiêu Đề Trang", "Số Inlinks Nhận Được"].forEach((h, idx) => {
        const c = s6H2Row.getCell(idx + 1);
        c.value = h;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
    });
    const topLinkedRow = topLinkStart + 2;
    structure.topLinkedPages.slice(0, 25).forEach((p, idx) => {
        const row = ws6.getRow(topLinkedRow + idx);
        row.height = 19;
        row.values = [idx + 1, p.url, p.title || p.url, p.inlinkCount];
        row.eachCell(c => {
            c.font = { name: "Segoe UI", size: 9 };
            c.border = thinBorder;
            if (idx % 2 === 1)
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
    });
    ws6.getColumn(1).width = 16;
    ws6.getColumn(2).width = 48;
    ws6.getColumn(3).width = 35;
    ws6.getColumn(4).width = 22;
    ws6.getColumn(5).width = 16;
    ws6.getColumn(6).width = 40;
    // Write base ExcelJS buffer
    let rawBuf = await wb.xlsx.writeBuffer();
    // Inject 3 native interactive Excel charts using chartsheet
    // Chart 1: Doughnut Chart on Sheet 1 (Topic distribution)
    rawBuf = await (0, chartsheet_1.addChart)(rawBuf, {
        sheet: "1. Tổng Quan",
        type: "doughnut",
        title: "Tỷ Trọng 12 Topic Mẹ & Bé",
        categories: `'1. Tổng Quan'!$A$9:$A$${topicEndRow}`,
        series: [{
                nameRef: "'1. Tổng Quan'!$B$8",
                ref: `'1. Tổng Quan'!$B$9:$B$${topicEndRow}`
            }],
        anchor: "D8:K22"
    });
    // Chart 2: Column Chart on Sheet 1 (SEO errors)
    rawBuf = await (0, chartsheet_1.addChart)(rawBuf, {
        sheet: "1. Tổng Quan",
        type: "column",
        title: "Phân Tích Số Lượng Lỗi SEO Phát Hiện",
        categories: `'1. Tổng Quan'!$A$${seoRowStart}:$A$${seoEndRow}`,
        series: [{
                nameRef: `'1. Tổng Quan'!$B$${seoHeaderRow}`,
                ref: `'1. Tổng Quan'!$B$${seoRowStart}:$B$${seoEndRow}`
            }],
        anchor: `D${seoHeaderRow}:K${seoHeaderRow + 15}`
    });
    // Chart 3: Bar Chart on Sheet 2 (Top 10 Subtopics)
    rawBuf = await (0, chartsheet_1.addChart)(rawBuf, {
        sheet: "2. Tỷ Trọng Topic",
        type: "bar",
        title: "Top 10 Subtopic Viết Nhiều Nhất",
        categories: "'2. Tỷ Trọng Topic'!$J$4:$J$13",
        series: [{
                nameRef: "'2. Tỷ Trọng Topic'!$K$3",
                ref: "'2. Tỷ Trọng Topic'!$K$4:$K$13"
            }],
        anchor: "M3:U17"
    });
    return Buffer.from(rawBuf);
}
