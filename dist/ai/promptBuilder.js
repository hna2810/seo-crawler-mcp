"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateCrawlStats = aggregateCrawlStats;
exports.buildSEOExpertPrompt = buildSEOExpertPrompt;
function aggregateCrawlStats(session, audit, structure, contentRatio, classifications) {
    const pages = Object.values(session.pages);
    const totalPages = pages.length;
    const articlePages = pages.filter(p => p.isArticle === true);
    const totalArticles = articlePages.length;
    const totalNonArticles = totalPages - totalArticles;
    // Depth distribution
    const depthDistribution = {};
    pages.forEach(p => {
        depthDistribution[p.depth] = (depthDistribution[p.depth] || 0) + 1;
    });
    // Word count stats on articles
    let totalWordCount = 0;
    let articlesUnder500Words = 0;
    articlePages.forEach(p => {
        totalWordCount += p.wordCount || 0;
        if ((p.wordCount || 0) < 500) {
            articlesUnder500Words++;
        }
    });
    const avgWordCountArticles = totalArticles > 0 ? Math.round(totalWordCount / totalArticles) : 0;
    // Audit sample data
    const sample404Urls = [];
    pages.forEach(p => {
        if (p.statusCode === 404 || p.isSoft404) {
            if (sample404Urls.length < 10)
                sample404Urls.push(p.url);
        }
    });
    // Duplicate titles aggregation
    const titleCounts = {};
    pages.forEach(p => {
        if (p.title && p.title.trim()) {
            const t = p.title.trim();
            titleCounts[t] = (titleCounts[t] || 0) + 1;
        }
    });
    const sampleDuplicateTitles = Object.entries(titleCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }));
    // Orphan pages
    const orphanPagesCount = structure.orphanPages ? structure.orphanPages.length : 0;
    const sampleOrphanPages = (structure.orphanPages || []).slice(0, 8).map(o => o.url);
    // Top sections
    const topSections = (structure.sectionsSummary || []).slice(0, 8).map(s => ({
        section: s.section,
        count: s.pageCount
    }));
    // Content Ratio & Content Gap
    const topicBreakdown = (contentRatio.topicDistributions || []).map(t => ({
        topic: t.topic,
        count: t.count,
        ratio: Number(t.ratio.toFixed(1))
    }));
    const topTopicName = contentRatio.topTopic ? contentRatio.topTopic.topic : "Chưa xác định";
    const topTopicRatio = contentRatio.topTopic ? Number(contentRatio.topTopic.ratio.toFixed(1)) : 0;
    const contentGaps = (contentRatio.contentGaps || []).map(g => ({
        topic: g.topic,
        missingSubtopics: g.subtopicsWithZeroArticles
    }));
    // Link Gap & Inlink analysis on articles
    let totalInArticleInternalLinks = 0;
    let deadEndArticlesCount = 0;
    const sampleDeadEndArticles = [];
    let articlesWithZeroInlinks = 0;
    let articlesWithOneInlink = 0;
    const isolatedArticlesList = [];
    const articleInlinkMap = [];
    const genericKeywords = new Set([
        "tại đây", "xem thêm", "ở đây", "click", "click here", "chi tiết", "xem chi tiết", "link",
        "đây", "ngay", "đọc thêm", "bấm vào đây", "truy cập"
    ]);
    const anchorCountMap = {};
    let totalAnchors = 0;
    let genericCount = 0;
    const externalDomainMap = {};
    articlePages.forEach(p => {
        const inlinksCount = p.inlinks ? p.inlinks.length : 0;
        articleInlinkMap.push({ url: p.url, title: p.title || p.url, inlinkCount: inlinksCount });
        if (inlinksCount === 0) {
            articlesWithZeroInlinks++;
            if (isolatedArticlesList.length < 15) {
                isolatedArticlesList.push({ url: p.url, title: p.title || p.url, inlinkCount: 0 });
            }
        }
        else if (inlinksCount === 1) {
            articlesWithOneInlink++;
            if (isolatedArticlesList.length < 15) {
                isolatedArticlesList.push({ url: p.url, title: p.title || p.url, inlinkCount: 1 });
            }
        }
        const internalOutlinks = (p.outlinks || []).filter((o) => !o.isExternal);
        totalInArticleInternalLinks += internalOutlinks.length;
        if (internalOutlinks.length === 0) {
            deadEndArticlesCount++;
            if (sampleDeadEndArticles.length < 8) {
                sampleDeadEndArticles.push({ url: p.url, title: p.title || p.url });
            }
        }
        // Anchor text and external links analysis
        (p.outlinks || []).forEach((o) => {
            const anchor = (o.anchorText || "").trim().toLowerCase();
            if (anchor) {
                totalAnchors++;
                anchorCountMap[anchor] = (anchorCountMap[anchor] || 0) + 1;
                if (genericKeywords.has(anchor)) {
                    genericCount++;
                }
            }
            if (o.isExternal && o.toUrl) {
                try {
                    const dom = new URL(o.toUrl).hostname.replace(/^www\./, "");
                    externalDomainMap[dom] = (externalDomainMap[dom] || 0) + 1;
                }
                catch { }
            }
        });
    });
    const avgInternalLinksPerArticle = totalArticles > 0
        ? Number((totalInArticleInternalLinks / totalArticles).toFixed(1))
        : 0;
    articleInlinkMap.sort((a, b) => b.inlinkCount - a.inlinkCount);
    const topLinkedArticles = articleInlinkMap.slice(0, 8);
    const sampleGenericAnchors = Object.entries(anchorCountMap)
        .filter(([txt]) => genericKeywords.has(txt))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([anchor, count]) => ({ anchor, count }));
    const sampleTopKeywordsAnchors = Object.entries(anchorCountMap)
        .filter(([txt]) => !genericKeywords.has(txt) && txt.length > 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([anchor, count]) => ({ anchor, count }));
    const externalDomainsLinked = Object.entries(externalDomainMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));
    return {
        rootUrl: session.rootUrl,
        totalPages,
        totalArticles,
        totalNonArticles,
        depthDistribution,
        avgWordCountArticles,
        articlesUnder500Words,
        criticalIssuesCount: audit.criticalCount || 0,
        warningIssuesCount: audit.warningCount || 0,
        error404Count: audit.summary?.statusCode404 || 0,
        soft404Count: pages.filter(p => p.isSoft404).length,
        redirectsCount: audit.summary?.redirects || 0,
        duplicateTitlesCount: audit.summary?.duplicateTitle || 0,
        duplicateContentCount: audit.summary?.duplicateContent || 0,
        missingMetaDescCount: audit.summary?.missingMetaDescription || 0,
        missingH1Count: audit.summary?.missingH1 || 0,
        multipleH1Count: audit.summary?.multipleH1 || 0,
        sample404Urls,
        sampleDuplicateTitles,
        orphanPagesCount,
        sampleOrphanPages,
        topSections,
        topicBreakdown,
        topTopicName,
        topTopicRatio,
        contentGaps,
        avgInternalLinksPerArticle,
        articlesWithZeroInlinks,
        articlesWithOneInlink,
        isolatedArticlesSample: isolatedArticlesList,
        deadEndArticlesCount,
        sampleDeadEndArticles,
        topLinkedArticles,
        totalAnchorsEvaluated: totalAnchors,
        genericAnchorsCount: genericCount,
        sampleGenericAnchors,
        sampleTopKeywordsAnchors,
        externalDomainsLinked
    };
}
function buildSEOExpertPrompt(session, audit, structure, contentRatio, classifications) {
    const stats = aggregateCrawlStats(session, audit, structure, contentRatio, classifications);
    const systemPrompt = `Bạn là một CHUYÊN GIA CHIẾN LƯỢC VÀ KỸ THUẬT SEO CẤP CAO (Senior SEO Director & Chief Strategist) với hơn 20 NĂM KINH NGHIỆM THỰC CHIẾN.
Bạn từng dẫn dắt thành công hàng trăm dự án SEO quy mô lớn, từ các tập đoàn e-commerce đến các dịch vụ chăm sóc sức khỏe, y tế gia đình và Mẹ & Bé.

Phong cách làm việc của bạn:
- SẮC BÉN, THỰC CHIẾN, CHUẨN XÁC: Đánh thẳng vào các lỗ hổng chí mạng của website dựa trên dữ liệu crawl thực tế, không nói chung chung, không dùng văn mẫu lý thuyết.
- TẬP TRUNG VÀO GIÁ TRỊ KINH DOANH VÀ THUẬT TOÁN GOOGLE: Bạn hiểu sâu sắc cách Google vận hành (Google Helpful Content System, Topic Authority, PageRank Flow, E-E-A-T, SpamBrain).
- HƯỚNG DẪN RÕ RÀNG TỪNG BƯỚC: Mọi nhận định đều đi kèm giải pháp hành động cụ thể, phân cấp ưu tiên (Quick wins vs Chiến lược dài hạn).

QUY ĐỊNH BẮT BUỘC VỀ NỘI DUNG VÀ TỪ NGỮ (TUÂN THỦ TUYỆT ĐỐI THEO CHÍNH SÁCH GOOGLE YMYL VÀ PHÁP LUẬT QUẢNG CÁO Y TẾ):
Khi tư vấn chiến lược nội dung cho website ngành Mẹ & Bé / Dịch vụ chăm sóc, bạn PHẢI CẢNH BÁO và CHỦ ĐỘNG KHÔNG ĐƯỢC PHÉP SỬ DỤNG các từ cấm nguy hiểm sau trong các đề xuất copy/tiêu đề:
- Tuyệt đối không dùng: "tốt nhất", "số 1", "duy nhất", "100% hiệu quả", "tuyệt đối", "khỏi", "chữa bệnh", "cam kết", "dứt điểm", "khỏi hoàn toàn", "hoàn toàn", "đảm bảo", "không bao giờ tái phát", "an toàn tuyệt đối", "chữa khỏi", "trị", "điều trị", "chữa trị", "điều trị dứt điểm", "trị tận gốc", "thuốc", "kê đơn", "chẩn đoán", "trắng da sau 1 đêm", "rẻ nhất thị trường".
- Nhắc nhở chủ website luôn truyền thông theo góc độ "đồng hành", "chăm sóc dịu lành", "hỗ trợ cải thiện", "phương pháp khoa học", tôn trọng quyền quyết định của bác sĩ chuyên khoa.

ĐỊNH DẠNG ĐẦU RA:
Báo cáo phải được trình bày hoàn toàn bằng Tiếng Việt, định dạng Markdown chuyên nghiệp, cấu trúc rõ ràng gồm đúng 5 phần chuẩn:
# 1. ĐÁNH GIÁ TỔNG QUAN HIỆN TRẠNG SEO & SỨC KHỎE KỸ THUẬT (Executive SEO Health Check)
# 2. PHÂN TÍCH CONTENT GAP & TỐI ƯU TOPIC CLUSTER (Chiến Lược Nội Dung Chuyên Sâu)
# 3. PHÂN TÍCH LINK GAP & KIẾN TRÚC LIÊN KẾT NỘI BỘ (Internal PageRank Flow & Silo Structure)
# 4. LỘ TRÌNH HÀNH ĐỘNG: TOP VIỆC NÊN LÀM NGAY (Prioritized Action Plan: Quick Wins & Mid-Term Roadmap)
# 5. CẢNH BÁO NGUY HIỂM: TOP VIỆC TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM / CẦN DỪNG LẠI (Anti-Patterns & Critical Pitfalls)`;
    const userPrompt = `Dưới đây là TOÀN BỘ BỨC TRANH DỮ LIỆU CRAWL VÀ KIỂM ĐỊNH SEO THỰC TẾ của website: ${stats.rootUrl}

============================================================
1. THÔNG SỐ TỔNG QUAN HỆ THỐNG TRANG & CẤU TRÚC (SITE OVERVIEW)
============================================================
- Domain / URL gốc: ${stats.rootUrl}
- Tổng số URL đã quét (Crawl coverage): ${stats.totalPages} URLs
- Số trang là Bài viết thực thụ (Articles): ${stats.totalArticles} bài viết (${stats.totalPages > 0 ? ((stats.totalArticles / stats.totalPages) * 100).toFixed(1) : 0}%)
- Số trang còn lại (Trang chủ, danh mục, liên hệ, chính sách, v.v.): ${stats.totalNonArticles} URLs
- Phân bổ độ sâu thu thập (Crawl Depth):
${Object.entries(stats.depthDistribution).map(([d, c]) => `  + Depth ${d}: ${c} trang`).join("\n")}
- Độ dài nội dung bài viết trung bình (Word count): ${stats.avgWordCountArticles} từ/bài
- Số bài viết ngắn (< 500 từ - nguy cơ thin content): ${stats.articlesUnder500Words} bài (${stats.totalArticles > 0 ? ((stats.articlesUnder500Words / stats.totalArticles) * 100).toFixed(1) : 0}%)
- Cấu trúc thư mục hàng đầu (Top Sections):
${stats.topSections.map(s => `  + Thư mục ${s.section}: ${s.count} trang`).join("\n") || "  + (Không phân tách rõ thư mục)"}

============================================================
2. BÁO CÁO LỖI SEO ON-PAGE & KỸ THUẬT (TECHNICAL SEO AUDIT)
============================================================
- Tổng số vấn đề nghiêm trọng (Critical): ${stats.criticalIssuesCount} lỗi
- Tổng số cảnh báo (Warning): ${stats.warningIssuesCount} cảnh báo
- Lỗi 404 trực tiếp (Dead Links): ${stats.error404Count} trang
- Lỗi Soft 404 (Trang bị xóa nhưng lén redirect 301/302 về trang chủ thay vì trả đúng 404): ${stats.soft404Count} trang
- Các URL 404/Soft 404 mẫu:
${stats.sample404Urls.map(u => `  + ${u}`).join("\n") || "  + (Không phát hiện lỗi 404 lớn)"}
- Số URL có chuyển hướng (Redirects): ${stats.redirectsCount}
- Thẻ Tiêu đề (Title Tags):
  + Trùng lặp tiêu đề: ${stats.duplicateTitlesCount} trang
  + Mẫu các tiêu đề bị nhân bản nhiều nhất:
${stats.sampleDuplicateTitles.map(t => `    * "${t.title}" (${t.count} trang dùng chung)`).join("\n") || "    * (Không có tiêu đề trùng lặp lớn)"}
- Thẻ Mô tả (Meta Description): Thiếu meta description ở ${stats.missingMetaDescCount} trang
- Thẻ Tiêu đề chính (H1):
  + Thiếu hoàn toàn thẻ H1: ${stats.missingH1Count} trang
  + Có nhiều hơn 1 thẻ H1 (Multiple H1s): ${stats.multipleH1Count} trang
- Trùng lặp nội dung thực sự (Duplicate Content, không tính redirect/canonical): ${stats.duplicateContentCount} trang
- Trang mồ côi (Orphan Pages - không có bất kỳ inlink nội bộ nào trỏ tới): ${stats.orphanPagesCount} trang
  + Danh sách trang mồ côi mẫu:
${stats.sampleOrphanPages.map(u => `  + ${u}`).join("\n") || "  + (Không có trang mồ côi)"}

============================================================
3. TỶ TRỌNG NỘI DUNG & DANH SÁCH CONTENT GAPS (TOPIC CLUSTERING)
============================================================
- Chủ đề chiếm tỷ trọng cao nhất: ${stats.topTopicName} (${stats.topTopicRatio}% tổng bài viết)
- Phân bổ bài viết theo 8 Chủ đề lớn ngành Mẹ & Bé:
${stats.topicBreakdown.map(t => `  + [${t.topic}]: ${t.count} bài viết (${t.ratio}%)`).join("\n")}
- DANH SÁCH CÁC LỖ HỔNG NỘI DUNG (CONTENT GAPS) - CÁC CHỦ ĐỀ CON (SUBTOPICS) ĐANG CÓ 0 BÀI VIẾT:
${stats.contentGaps.map(g => {
        const missing = g.missingSubtopics.length > 0 ? g.missingSubtopics.join(", ") : "Đã có đủ bài viết cho các chủ đề con";
        return `  * Trong chủ đề [${g.topic}]:
    -> Các chủ đề con ĐANG THIẾU HOÀN TOÀN: ${missing}`;
    }).join("\n")}

============================================================
4. KIẾN TRÚC LIÊN KẾT NỘI BỘ & LINK GAP (INTERNAL LINK ARCHITECTURE)
============================================================
- Trung bình internal links đặt trong thân bài viết: ${stats.avgInternalLinksPerArticle} liên kết/bài
- LINK GAP (BÀI VIẾT BỊ CÔ LẬP, THIẾU INLINKS NHẬN TRUYỀN PAGERANK):
  + Số bài viết có 0 Inlink (hoàn toàn không được bài nào khác nhắc đến): ${stats.articlesWithZeroInlinks} bài (${stats.totalArticles > 0 ? ((stats.articlesWithZeroInlinks / stats.totalArticles) * 100).toFixed(1) : 0}%)
  + Số bài viết chỉ có DUY NHẤT 1 Inlink (rất mong manh, PageRank truyền tới cực thấp): ${stats.articlesWithOneInlink} bài (${stats.totalArticles > 0 ? ((stats.articlesWithOneInlink / stats.totalArticles) * 100).toFixed(1) : 0}%)
  + Mẫu các bài viết đang bị đói inlinks (Link Gap):
${stats.isolatedArticlesSample.map(a => `    * "${a.title}" (${a.url}) -> Chỉ có ${a.inlinkCount} inlinks!`).join("\n") || "    * (Hầu hết bài viết đều có inlinks)"}
- Bài viết cụt (Dead-end articles - không hề trỏ link đến bài viết nào khác): ${stats.deadEndArticlesCount} bài
  + Mẫu các bài viết cụt:
${stats.sampleDeadEndArticles.map(a => `    * "${a.title}" (${a.url})`).join("\n") || "    * (Không có bài viết cụt)"}
- Top các bài viết được liên kết nội bộ nhiều nhất (Top Linked Pages):
${stats.topLinkedArticles.map(a => `  + "${a.title}" (${a.url}): ${a.inlinkCount} inlinks`).join("\n")}
- Sức khỏe Anchor Text:
  + Tổng số liên kết có anchor text được khảo sát: ${stats.totalAnchorsEvaluated}
  + Tỷ lệ Anchor Text chung chung vô nghĩa (Generic Anchors như 'tại đây', 'xem thêm', 'chi tiết'): ${stats.genericAnchorsCount} (${stats.totalAnchorsEvaluated > 0 ? ((stats.genericAnchorsCount / stats.totalAnchorsEvaluated) * 100).toFixed(1) : 0}%)
  + Các Anchor Text chung chung phổ biến:
${stats.sampleGenericAnchors.map(g => `    * "${g.anchor}": ${g.count} lần`).join("\n") || "    * (Không có anchor chung chung đáng kể)"}
  + Các Keyword Anchor Text phổ biến nhất:
${stats.sampleTopKeywordsAnchors.map(k => `    * "${k.anchor}": ${k.count} lần`).join("\n") || "    * (Chưa rõ)"}
- Liên kết ngoài (External Outlinks):
  + Các tên miền ngoại bộ được dẫn nguồn nhiều nhất:
${stats.externalDomainsLinked.map(d => `    * ${d.domain}: ${d.count} liên kết`).join("\n") || "    * (Chưa có external links ra ngoài)"}

============================================================
YÊU CẦU ĐỐI VỚI BẠN (CHUYÊN GIA SEO 20 NĂM KINH NGHIỆM):
Hãy dựa vào các số liệu thực tế được cung cấp bên trên để viết một bài phân tích chuyên sâu, toàn diện và đầy uy lực theo đúng 5 mục đã quy định:
1. ĐÁNH GIÁ TỔNG QUAN HIỆN TRẠNG SEO & SỨC KHỎE KỸ THUẬT (Phân tích chỉ số, độ sâu, thin content, 404, soft 404, cấu trúc thư mục).
2. PHÂN TÍCH CONTENT GAP & TỐI ƯU TOPIC CLUSTER (Chỉ rõ chủ đề nào đang bị thiên lệch, phân tích chi tiết các Content Gaps và kế hoạch lập dàn ý bài viết để bao phủ Topical Authority).
3. PHÂN TÍCH LINK GAP & KIẾN TRÚC LIÊN KẾT NỘI BỘ (Chỉ rõ những bài viết quan trọng đang bị bỏ đói link, giải pháp phân bổ lại PageRank theo mô hình Topic Cluster Silo, xử lý các anchor text chung chung 'tại đây').
4. LỘ TRÌNH HÀNH ĐỘNG: TOP VIỆC NÊN LÀM NGAY (Liệt kê danh sách ưu tiên cao nhất, phân chia Quick Wins làm trong 48 giờ và Kế hoạch 30-60 ngày).
5. CẢNH BÁO NGUY HIỂM: TOP VIỆC TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM / CẦN DỪNG LẠI (Vạch mặt các sai lầm đang mắc phải như Soft 404 redirect hàng loạt, nhồi nhét từ khóa, cấu trúc link sai lệch, và cảnh báo nghiêm ngặt về từ ngữ y tế YMYL theo quy định cấm).

Hãy bắt đầu bài phân tích chuyên nghiệp của bạn ngay bây giờ!`;
    return { systemPrompt, userPrompt };
}
