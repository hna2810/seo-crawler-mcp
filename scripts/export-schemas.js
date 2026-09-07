const fs = require("fs");
const path = require("path");

const targetDir = "C:\\Users\\Administrator\\.gemini\\antigravity\\mcp\\seo-crawler";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const tools = [
  {
    name: "crawl_website",
    description: "Crawl toàn bộ hoặc một phần website để thu thập toàn bộ dữ liệu URL, Title, H1-H4, Meta robots, Canonical, Word count, Inlinks/Outlinks, Anchor texts và Bold keywords.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL gốc của website cần quét (ví dụ: https://homecaresausinh.com)" },
        mode: { type: "string", enum: ["full", "sitemap", "fast"], description: "Chế độ quét: full, sitemap, fast" },
        sitemapUrl: { type: "string", description: "URL sitemap tùy chọn" },
        maxDepth: { type: "number", description: "Độ sâu quét tối đa (mặc định: 3)" },
        maxPages: { type: "number", description: "Số trang tối đa cần quét (mặc định: 100)" },
        includePattern: { type: "string", description: "Regex lọc URL cần quét" },
        excludePattern: { type: "string", description: "Regex bỏ qua URL" },
        concurrency: { type: "number", description: "Số lượng request đồng thời (mặc định: 3)" },
        delayMs: { type: "number", description: "Độ trễ giữa các request ms (mặc định: 200)" }
      },
      required: ["url"]
    }
  },
  {
    name: "audit_seo_issues",
    description: "Phát hiện toàn diện các lỗi SEO On-page & kỹ thuật: 404, 410, 301/302, thiếu/trùng Title, Title dài > 60 ký tự, thiếu Meta description, thiếu/nhiều H1, Thin content (<250 từ), Duplicate content, Noindex, liên kết gãy.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID phiên quét" },
        filterSeverity: { type: "string", enum: ["all", "critical", "warning", "info"], description: "Lọc theo mức độ" },
        filterCategory: { type: "string", enum: ["all", "status", "meta", "content", "indexing", "links"], description: "Lọc theo danh mục" }
      }
    }
  },
  {
    name: "analyze_site_structure",
    description: "Tự động xây dựng sơ đồ phân cấp website (Site Hierarchy Tree), phân bố độ sâu URL, phát hiện trang mồ côi (Orphan Pages - 0 internal links) và thống kê trang có nhiều inlinks nhất.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID phiên quét" }
      }
    }
  },
  {
    name: "classify_content_topics",
    description: "Phân loại chủ đề nội dung toàn bộ URL đã crawl theo khung Taxonomy Mẹ & Bé (12 Topic chuẩn + Subtopic + Specific Topic + Context + Location + Confidence). Xuất báo cáo Tỷ trọng nội dung (Content Ratio) và xác định chủ đề viết nhiều nhất / chủ đề bị bỏ quên (Content Gap).",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID phiên quét" },
        topicFilter: { type: "string", description: "Lọc theo Topic" }
      }
    }
  },
  {
    name: "classify_single_url_or_text",
    description: "Phân loại tức thì một bài viết, tiêu đề hoặc từ khóa tìm kiếm thành Topic -> Subtopic -> Specific Topic -> Context -> Location mà không cần crawl cả website.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL hoặc slug bài viết" },
        title: { type: "string", description: "Tiêu đề bài viết hoặc câu hỏi tìm kiếm" },
        h1: { type: "string", description: "Tiêu đề thẻ H1" },
        headings: { type: "array", items: { type: "string" }, description: "Danh sách thẻ H2, H3" },
        boldKeywords: { type: "array", items: { type: "string" }, description: "Các từ khóa in đậm" },
        mainText: { type: "string", description: "Đoạn văn trích dẫn hoặc nội dung chính" }
      }
    }
  },
  {
    name: "export_crawl_report",
    description: "Xuất báo cáo tổng hợp hoàn chỉnh (Tổng quan + Lỗi SEO On-page + Cây cấu trúc Website + Tỷ trọng Phân loại Chủ đề Mẹ & Bé) định dạng Markdown hoặc JSON.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID phiên quét" },
        format: { type: "string", enum: ["markdown", "json"], description: "Định dạng xuất" }
      }
    }
  },
  {
    name: "get_taxonomy",
    description: "Trả về toàn bộ bộ khung Taxonomy ngành Mẹ & Bé (12 Topic chính, danh sách Subtopic, Specific Topics, danh mục Content Context và danh sách Địa phương Location) để tham khảo.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

for (const t of tools) {
  const filePath = path.join(targetDir, t.name + ".json");
  fs.writeFileSync(filePath, JSON.stringify(t, null, 2), "utf-8");
  console.log("Wrote schema:", t.name + ".json");
}
console.log("Successfully exported all 7 MCP tool schemas!");
