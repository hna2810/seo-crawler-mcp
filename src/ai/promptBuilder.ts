import { PageData, ClassificationResult } from "../crawler/types";
import { CrawlSession } from "../crawler/session";
import { ContentRatioReport } from "../classifier/contentRatio";

export interface AggregatedContentStats {
  rootUrl: string;
  totalArticles: number;
  avgWordCount: number;
  articlesUnder500Words: number;
  articlesOver1500Words: number;
  
  // Topic Breakdown & Content Gap
  topicBreakdown: { topic: string; count: number; ratio: number; subtopicsWithCount: { subtopic: string; count: number }[] }[];
  topTopicName: string;
  topTopicRatio: number;
  contentGaps: { topic: string; missingSubtopics: string[] }[];
  
  // Search Intent & Context
  contextBreakdown: { context: string; count: number; ratio: number }[];
  locationBreakdown: { location: string; count: number; ratio: number }[];
  
  // Sample Real Articles for Deep Content Understanding
  sampleArticles: { title: string; url: string; wordCount: number; topic?: string; subtopic?: string; context?: string }[];
  
  // Cannibalization risk sample (titles having very similar roots)
  potentialCannibalization: { topic: string; subtopic: string; articles: string[] }[];
}

export function aggregateContentStats(
  session: CrawlSession,
  contentRatio: ContentRatioReport,
  classifications: ClassificationResult[]
): AggregatedContentStats {
  const pages = Object.values(session.pages) as PageData[];
  const articlePages = pages.filter(p => p.isArticle === true);
  const totalArticles = articlePages.length;

  // Word count analysis
  let totalWordCount = 0;
  let articlesUnder500Words = 0;
  let articlesOver1500Words = 0;

  articlePages.forEach(p => {
    const wc = p.wordCount || 0;
    totalWordCount += wc;
    if (wc < 500) articlesUnder500Words++;
    if (wc >= 1500) articlesOver1500Words++;
  });

  const avgWordCount = totalArticles > 0 ? Math.round(totalWordCount / totalArticles) : 0;

  // Map classification by URL
  const classifMap = new Map<string, ClassificationResult>();
  classifications.forEach(c => classifMap.set(c.url, c));

  // Topic & Subtopics Breakdown
  const topicBreakdown = (contentRatio.topicDistributions || []).map(t => ({
    topic: t.topic,
    count: t.count,
    ratio: Number(t.ratio.toFixed(1)),
    subtopicsWithCount: (t.subtopics || []).map(s => ({
      subtopic: s.subtopic,
      count: s.count
    }))
  }));

  const topTopicName = contentRatio.topTopic ? contentRatio.topTopic.topic : "Chưa xác định";
  const topTopicRatio = contentRatio.topTopic ? Number(contentRatio.topTopic.ratio.toFixed(1)) : 0;

  // Content Gaps (Subtopics with 0 articles)
  const contentGaps = (contentRatio.contentGaps || []).map(g => ({
    topic: g.topic,
    missingSubtopics: g.subtopicsWithZeroArticles
  }));

  // Intent & Context
  const contextBreakdown = (contentRatio.contextBreakdown || []).map(c => ({
    context: c.context,
    count: c.count,
    ratio: Number(c.ratio.toFixed(1))
  }));

  const locationBreakdown = (contentRatio.locationBreakdown || []).map(l => ({
    location: l.location,
    count: l.count,
    ratio: Number(l.ratio.toFixed(1))
  }));

  // Sample actual articles (up to 20 articles)
  const sampleArticles = articlePages.slice(0, 20).map(p => {
    const c = classifMap.get(p.url);
    return {
      title: p.title || p.url,
      url: p.url,
      wordCount: p.wordCount || 0,
      topic: c?.topic,
      subtopic: c?.subtopic,
      context: c?.context
    };
  });

  // Check potential cannibalization: multiple articles targeting the same subtopic
  const subtopicArticlesMap = new Map<string, { topic: string; subtopic: string; articles: string[] }>();
  classifications.forEach(c => {
    if (c.subtopic && c.subtopic !== "Chung" && c.title) {
      const key = `${c.topic}:::${c.subtopic}`;
      if (!subtopicArticlesMap.has(key)) {
        subtopicArticlesMap.set(key, { topic: c.topic, subtopic: c.subtopic, articles: [] });
      }
      const item = subtopicArticlesMap.get(key)!;
      if (item.articles.length < 5) {
        item.articles.push(c.title);
      }
    }
  });

  const potentialCannibalization = Array.from(subtopicArticlesMap.values())
    .filter(item => item.articles.length >= 3)
    .slice(0, 5);

  return {
    rootUrl: session.rootUrl,
    totalArticles,
    avgWordCount,
    articlesUnder500Words,
    articlesOver1500Words,
    topicBreakdown,
    topTopicName,
    topTopicRatio,
    contentGaps,
    contextBreakdown,
    locationBreakdown,
    sampleArticles,
    potentialCannibalization
  };
}

export function buildSEOExpertPrompt(
  session: CrawlSession,
  _audit: any,
  _structure: any,
  contentRatio: ContentRatioReport,
  classifications: ClassificationResult[]
): { systemPrompt: string; userPrompt: string } {
  const stats = aggregateContentStats(session, contentRatio, classifications);

  const systemPrompt = `Bạn là một GIÁM ĐỐC CHIẾN LƯỢC NỘI DUNG SEO & TỔNG BIÊN TẬP NỘI DUNG CẤP CAO (Senior Content SEO Director & Chief Content Strategist) với hơn 20 NĂM KINH NGHIỆM THỰC CHIẾN.
Bạn từng xây dựng chiến lược nội dung và cấu trúc Topic Cluster dẫn đầu thị trường cho hàng trăm thương hiệu lớn trong ngành Mẹ & Bé, Chăm sóc sau sinh, Sức khỏe gia đình và Thương mại điện tử.

QUY TẮC PHẠM VI PHÂN TÍCH (QUAN TRỌNG NHẤT):
- Bạn CHỈ TẬP TRUNG DUY NHẤT VÀO NỘI DUNG (Content, Content Gap, Topic Cluster, Search Intent, Topical Authority, Kế hoạch lên bài và Copywriting).
- TUYỆT ĐỐI KHÔNG phân tích các lỗi kỹ thuật (không phân tích 404, redirect, server, hosting, crawl depth technical) và KHÔNG phân tích mô hình link kỹ thuật. Toàn bộ trọng tâm dành 100% cho CHIẾN LƯỢC NỘI DUNG.

QUY ĐỊNH BẮT BUỘC VỀ VIẾT BÀI VÀ TỪ CẤM (TUÂN THỦ CHÍNH SÁCH GOOGLE YMYL & QUẢNG CÁO Y TẾ):
Khi tư vấn nội dung và tiêu đề cho ngành Mẹ & Bé, bạn PHẢI CẢNH BÁO CHỦ WEBSITE và BẢN THÂN BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC DÙNG các từ cấm sau:
- Danh sách từ cấm: "tốt nhất", "số 1", "duy nhất", "100% hiệu quả", "tuyệt đối", "khỏi", "chữa bệnh", "cam kết", "dứt điểm", "khỏi hoàn toàn", "hoàn toàn", "đảm bảo", "không bao giờ tái phát", "an toàn tuyệt đối", "chữa khỏi", "trị", "điều trị", "chữa trị", "điều trị dứt điểm", "trị tận gốc", "thuốc", "kê đơn", "chẩn đoán", "trắng da sau 1 đêm", "rẻ nhất thị trường".
- Quy tắc mở bài (Sapo) SEO: Đoạn 1 đánh trực diện vào ý định tìm kiếm và nỗi đau thực tế của mẹ bầu/mẹ sau sinh, chứa từ khóa chính in đậm ở dòng 1. Đoạn 2 nêu giải pháp. TUYỆT ĐỐI CẤM mở bài sáo rỗng kiểu *"Trong xã hội hiện đại ngày nay..."*, *"Nhu cầu tìm hiểu..."*, *"Như chúng ta đã biết..."*.

CẤU TRÚC BÀI PHÂN TÍCH (BẮT BUỘC TRÌNH BÀY ĐẦY ĐỦ 4 MỤC CHUYÊN SÂU NỘI DUNG DƯỚI ĐỊNH DẠNG MARKDOWN TIẾNG VIỆT):
# 1. ĐÁNH GIÁ TỔNG QUAN HIỆN TRẠNG NỘI DUNG (Content Audit & Health Check)
# 2. PHÂN TÍCH CONTENT GAP & LỖ HỔNG TOPIC CLUSTER (Chi Tiết Subtopics Đang Bị Bỏ Trống)
# 3. KẾ HOẠCH HÀNH ĐỘNG NỘI DUNG: DANH SÁCH BÀI VIẾT & CHỦ ĐỀ NÊN VIẾT NGAY (Content Action Plan & Editorial Roadmap)
# 4. CẢNH BÁO NGUY HIỂM: NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM TRONG NỘI DUNG (Content Anti-Patterns & Banned Rules)`;

  const userPrompt = `Dưới đây là TOÀN BỘ DỮ LIỆU NỘI DUNG THỰC TẾ đã thu thập được từ website: ${stats.rootUrl}

============================================================
1. TỔNG QUAN HỆ THỐNG NỘI DUNG BÀI VIẾT (CONTENT OVERVIEW)
============================================================
- Website: ${stats.rootUrl}
- Tổng số bài viết nội dung thực thụ (Articles): ${stats.totalArticles} bài viết
- Độ dài bài viết trung bình: ${stats.avgWordCount} từ/bài
- Số bài viết ngắn (< 500 từ - nguy cơ nội dung mỏng / Thin Content): ${stats.articlesUnder500Words} bài (${stats.totalArticles > 0 ? ((stats.articlesUnder500Words / stats.totalArticles) * 100).toFixed(1) : 0}%)
- Số bài viết chuyên sâu (>= 1500 từ): ${stats.articlesOver1500Words} bài (${stats.totalArticles > 0 ? ((stats.articlesOver1500Words / stats.totalArticles) * 100).toFixed(1) : 0}%)

- DANH SÁCH MỘT SỐ BÀI VIẾT THỰC TẾ ĐANG CÓ TRÊN WEB:
${stats.sampleArticles.map(a => `  + "${a.title}" (${a.wordCount} từ) [Chủ đề: ${a.topic || "Chung"} -> ${a.subtopic || "Chung"} | Dạng: ${a.context || "Chung"}]`).join("\n") || "  + (Chưa có bài viết mẫu)"}

============================================================
2. TỶ TRỌNG PHÂN BỔ NỘI DUNG (TOPIC DISTRIBUTION)
============================================================
- Chủ đề có nhiều bài viết nhất: [${stats.topTopicName}] chiếm ${stats.topTopicRatio}% tổng lượng bài viết.
- Phân bổ chi tiết 8 chủ đề lớn ngành Mẹ & Bé:
${stats.topicBreakdown.map(t => {
  const subInfo = t.subtopicsWithCount.length > 0
    ? t.subtopicsWithCount.map(s => `${s.subtopic} (${s.count} bài)`).join(", ")
    : "Chưa phân nhóm subtopic cụ thể";
  return `  + [${t.topic}]: ${t.count} bài viết (${t.ratio}%)
    -> Các nhánh con đã có bài: ${subInfo}`;
}).join("\n")}

- Phân bổ theo Ý định tìm kiếm & Góc độ tiếp cận (Search Intent / Context):
${stats.contextBreakdown.map(c => `  + Dạng bài [${c.context}]: ${c.count} bài (${c.ratio}%)`).join("\n") || "  + (Chưa phân tách context)"}

- Phân bổ theo Địa phương / Khu vực (Location):
${stats.locationBreakdown.map(l => `  + Khu vực [${l.location}]: ${l.count} bài (${l.ratio}%)`).join("\n") || "  + (Toàn quốc)"}

============================================================
3. DANH SÁCH LỖ HỔNG NỘI DUNG (CONTENT GAPS - CÁC CHỦ ĐỀ CON CÓ 0 BÀI VIẾT)
============================================================
Dưới đây là danh sách những chủ đề con (Subtopics) quan trọng trong ngành Mẹ & Bé mà website ĐANG THIẾU HOÀN TOÀN (0 bài viết):
${stats.contentGaps.map(g => {
  const missing = g.missingSubtopics.length > 0 ? g.missingSubtopics.join("; ") : "Đã phủ sóng đầy đủ các chủ đề con";
  return `  * Trong chủ đề [${g.topic}]:
    -> Các chủ đề con ĐANG THIẾU HOÀN TOÀN: ${missing}`;
}).join("\n")}

${stats.potentialCannibalization.length > 0 ? `
- CẢNH BÁO NGUY CƠ ĂN THỊT TỪ KHÓA (CANNIBALIZATION) DO TẬP TRUNG QUÁ NHIỀU BÀI VÀO CÙNG 1 CHỦ ĐỀ CON:
${stats.potentialCannibalization.map(item => `  * Chủ đề con [${item.topic} -> ${item.subtopic}] đang có nhiều bài viết tương tự:
${item.articles.map(title => `    - "${title}"`).join("\n")}`).join("\n")}
` : ""}

============================================================
YÊU CẦU ĐỐI VỚI BẠN (CHUYÊN GIA CHIẾN LƯỢC NỘI DUNG SEO 20 NĂM KINH NGHIỆM):
Dựa vào các số liệu nội dung thực tế ở trên, hãy đưa ra một bản phân tích chiến lược nội dung chuyên sâu, thực chiến và giá trị cao theo đúng 4 phần đã quy định:

1. ĐÁNH GIÁ TỔNG QUAN HIỆN TRẠNG NỘI DUNG (Content Audit & Health Check):
   - Nhận định sắc bén về độ bao phủ và sự thiên lệch chủ đề (Topic dominance vs Topic starvation).
   - Phân tích chất lượng bài viết thông qua độ dài từ ngữ và tỷ lệ bài viết mỏng (Thin content).
   - Đánh giá sự cân đối giữa các dạng bài (Hướng dẫn, Dịch vụ, Chi phí, Review, Phòng ngừa).

2. PHÂN TÍCH CONTENT GAP & LỖ HỔNG TOPIC CLUSTER:
   - Mổ xẻ chi tiết những Content Gaps nguy hiểm nhất đang làm website mất Topical Authority vào tay đối thủ.
   - Phân tích nguy cơ ăn thịt từ khóa (Cannibalization) nếu có quá nhiều bài viết dồn vào một chủ đề con hẹp.

3. KẾ HOẠCH HÀNH ĐỘNG NỘI DUNG: DANH SÁCH BÀI VIẾT & CHỦ ĐỀ NÊN VIẾT NGAY (Content Action Plan):
   - Đề xuất ít nhất 8 - 12 Tiêu đề bài viết cụ thể (Title & H1) để lấp đầy các Content Gaps lớn nhất.
   - Tiêu đề phải cuốn hút, kích thích click (High-CTR) nhưng CHUẨN MỰC, không sáo rỗng.
   - Hướng dẫn cấu trúc Mở bài (Sapo) cuốn hút: đánh trực diện vào nỗi đau thực tế của khách hàng trong 3 giây đầu tiên.

4. CẢNH BÁO NGUY HIỂM: NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM TRONG NỘI DUNG:
   - Chỉ ra những sai lầm chết người trong sản xuất nội dung cần dừng lại ngay.
   - Cảnh báo nghiêm ngặt về danh sách từ cấm y tế/chữa bệnh và các cam kết quảng cáo sai lệch.

Hãy bắt đầu bài phân tích chiến lược nội dung chuyên nghiệp của bạn ngay bây giờ!`;

  return { systemPrompt, userPrompt };
}
