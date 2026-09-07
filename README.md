# SEO Crawler & Mother-Baby Content Classifier MCP Server

MCP Server chuyên sâu cho việc **Quét toàn bộ bài viết của 1 website**, **Phát hiện lỗi SEO On-page & Kỹ thuật**, **Phân tích Cấu trúc Phân cấp Website**, và **Phân loại Chủ đề Nội dung Mẹ & Bé đa chiều** theo chuẩn Model Context Protocol (MCP).

---

## 1. Tính năng Nổi bật

### 1.1. Thu thập Toàn bộ Dữ liệu Website (`crawl_website`)
- Hỗ trợ quét toàn trang (`full`), quét qua XML Sitemap (`sitemap`), hoặc quét nhanh (`fast`).
- Tự động đọc và tôn trọng chỉ thị `robots.txt`.
- Tự động phát hiện Sitemap (`/sitemap.xml`, `/sitemap_index.xml`, `/wp-sitemap.xml`,...).
- Giới hạn cùng domain, không crawl external link.
- Thu thập cho mỗi URL:
  - **Thông tin cơ bản**: URL, Final URL (sau redirect), Status code, Content Type, Crawl time.
  - **SEO On-page**: Title, Meta Description, H1, H2-H4, Meta robots, Canonical, Word count.
  - **Nội dung ngữ nghĩa**: Từ khóa in đậm (`<strong>`, `<b>`), văn bản chính bài viết.
  - **Liên kết**: Tổng internal links, external links, anchor text, và tự động dựng mạng lưới liên kết trỏ đến (**Inlinks**).

### 1.2. Phát hiện Lỗi SEO Tự động (`audit_seo_issues`)
- **Mã phản hồi HTTP**: Lỗi 404 (Not Found), 410 (Gone), chuyển hướng 301/302, lỗi máy chủ 5xx.
- **Thẻ Meta**: Thiếu Title, Trùng lặp Title (Duplicate Title), Title SEO quá dài (>60 ký tự), Thiếu Meta Description, Meta Description quá dài (>160 ký tự).
- **Thẻ Heading**: Thiếu thẻ H1, Nhiều hơn 1 thẻ H1 (Multiple H1).
- **Chất lượng Nội dung**: Thin content (bài viết mỏng < 250 từ), Nội dung trùng lặp (Duplicate Content dựa trên thuật toán Shingles & Jaccard similarity ≥ 85%).
- **Lập chỉ mục**: Phát hiện thẻ Noindex, Thẻ Canonical sai lệch (Canonical mismatch).
- **Liên kết**: Phát hiện Broken Internal Link (link nội bộ trỏ tới trang 404/410).

### 1.3. Phân tích Cấu trúc Website (`analyze_site_structure`)
- Tự động dựng cây phân cấp thư mục (Site Hierarchy Tree dạng ASCII và JSON).
- Phân tích độ sâu phân tầng URL (Depth Distribution).
- Phát hiện **Trang mồ côi (Orphan Pages)**: Các trang có 0 internal inlinks trỏ đến.
- Thống kê Top URL nhận nhiều internal links nhất.

### 1.4. Phân loại Chủ đề Mẹ & Bé Đa chiều (`classify_content_topics` & `classify_single_url_or_text`)
Áp dụng bộ khung Taxonomy chuẩn 12 Topic lớn:
1. `MẸ BẦU / THAI KỲ` (25+ subtopics)
2. `TRẺ SƠ SINH` (26+ subtopics)
3. `TRẺ NHỎ` (19+ subtopics)
4. `MẸ SAU SINH` (25+ subtopics)
5. `Ở CỮ` (17+ subtopics)
6. `DINH DƯỠNG MẸ & BÉ` (15+ subtopics)
7. `CHĂM SÓC DA MẸ & BÉ` (15+ subtopics)
8. `SỨC KHỎE MẸ & BÉ` (13+ subtopics)
9. `TẮM & VỆ SINH` (12+ subtopics)
10. `NUÔI DẠY CON` (14+ subtopics)
11. `SẢN PHẨM MẸ & BÉ` (19+ subtopics)
12. `DỊCH VỤ MẸ & BÉ` (Tắm bé, Tắm bé tại nhà, Massage bầu, Thông tắc tia sữa, Chăm sóc mẹ sau sinh,...)

Bóc tách 2 Dimension riêng biệt:
- **Location**: Hà Nội, TP.HCM, Hải Phòng, Bắc Ninh, Quảng Ninh, Cần Thơ, Đà Nẵng, v.v.
- **Context**: Hướng dẫn, Nguyên nhân, Dấu hiệu, Cách xử lý, Phòng ngừa, Có nên / không nên, So sánh, Review, Đánh giá, Kinh nghiệm, Chi phí / Giá, Thành phần, Công dụng, Cách sử dụng, Địa điểm, Dịch vụ.

Kiến trúc phân loại:
```text
TOPIC
│
├── SUBTOPIC
│   │
│   └── SPECIFIC TOPIC
│
├── CONTEXT
│
└── LOCATION
```

### 1.5. Báo cáo Tỷ trọng Nội dung (`computeContentRatio`)
- Thống kê Topic được viết nhiều nhất và tỷ trọng % (`Content Ratio`).
- Thống kê Subtopic được viết nhiều nhất.
- Phát hiện các **Chủ đề bỏ ngỏ (Content Gaps)**: Các chủ đề con chưa có bài viết nào để gợi ý sản xuất nội dung.

---

## 2. Cài đặt & Chạy Thử nghiệm

### Yêu cầu:
- Node.js >= 18 (Đã kiểm thử tối ưu trên Node.js v26.1.0)

### Cài đặt:
```bash
cd seo-crawler-mcp
npm install
npm run build
```

### Chạy Giao diện Web Dashboard:
```bash
npm run ui
```
Truy cập trình duyệt: `http://localhost:3333` (Theo dõi tiến trình cào theo thời gian thực, nạp lại phiên cào cũ từ dropdown Lịch sử quét, xuất file Excel đa sheet native kèm 3 biểu đồ tương tác).

### Chạy chế độ MCP Server:
```bash
npm start
```

### Chạy test suite:
```bash
npx ts-node test/test-all.ts
```

---

## 3. Danh sách Công cụ MCP (MCP Tools)

| Tên Tool | Mô tả |
| :--- | :--- |
| `crawl_website` | Crawl website (tùy chọn maxDepth, maxPages, sitemap, regex include/exclude, delay) |
| `audit_seo_issues` | Kiểm tra toàn diện lỗi SEO kỹ thuật & On-page (404, 301, trùng title, thin content...) |
| `analyze_site_structure` | Xuất sơ đồ cây cấu trúc URL, độ sâu, trang mồ côi (Orphan pages) |
| `classify_content_topics` | Phân loại toàn bộ URL theo Taxonomy Mẹ & Bé, tính tỷ trọng nội dung và Content Gaps |
| `classify_single_url_or_text` | Phân loại tức thì 1 tiêu đề/URL/bài viết theo Topic -> Subtopic -> Specific Topic -> Context -> Location |
| `export_crawl_report` | Xuất báo cáo tổng quan Markdown hoặc JSON hoàn chỉnh |
| `get_taxonomy` | Trả về toàn bộ danh mục 12 Topic, Subtopics, Contexts, Locations |

---

## 4. Tích hợp vào Cấu hình MCP

Thêm cấu hình vào `mcp_config.json` (Claude Desktop hoặc Antigravity):
```json
{
  "mcpServers": {
    "seo-crawler": {
      "command": "node",
      "args": [
        "c:\\Users\\Administrator\\Desktop\\ads\\seo-crawler-mcp\\dist\\index.js"
      ]
    }
  }
}
```
