import { classifyContent } from "../src/classifier/topicClassifier";
import { performSEOAudit } from "../src/analyzer/seoAudit";
import { buildSiteStructure } from "../src/analyzer/siteTree";
import { computeContentRatio } from "../src/classifier/contentRatio";
import { PageData } from "../src/crawler/types";

console.log("=========================================");
console.log("RUNNING SEO CRAWLER & CLASSIFIER MCP TESTS");
console.log("=========================================\n");

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// 1. TEST USER EXACT EXAMPLE
console.log("--- 1. Testing Taxonomy Classification with User Example ---");
const userExample = classifyContent({
  title: "Dịch vụ tắm bé tại nhà Hà Nội giá bao nhiêu?",
  url: "https://homecaresausinh.com/dich-vu-tam-be-tai-nha-ha-noi-gia-bao-nhieu"
});

console.log("Result:", JSON.stringify(userExample, null, 2));
assert(userExample.topic === "DỊCH VỤ MẸ & BÉ", "Topic should be 'DỊCH VỤ MẸ & BÉ'");
assert(userExample.subtopic === "Tắm bé", "Subtopic should be 'Tắm bé'");
assert(userExample.specificTopic === "Tắm bé tại nhà", "Specific Topic should be 'Tắm bé tại nhà'");
assert(userExample.context === "Chi phí / Giá", "Context should be 'Chi phí / Giá'");
assert(userExample.location === "Hà Nội", "Location should be 'Hà Nội'");
assert(userExample.confidence >= 0.7, "Confidence should be >= 0.70");

// 2. TEST OTHER SAMPLE QUERIES
console.log("\n--- 2. Testing Additional Diverse Queries ---");
const testPregnancy = classifyContent({
  title: "Bí quyết phòng ngừa rạn da khi mang thai cho mẹ bầu",
  url: "/phong-ngua-ran-da-khi-mang-thai"
});
assert(testPregnancy.topic === "MẸ BẦU / THAI KỲ", "Topic should be 'MẸ BẦU / THAI KỲ'");
assert(testPregnancy.subtopic === "Chăm sóc da khi mang thai", "Subtopic should be 'Chăm sóc da khi mang thai'");
assert(testPregnancy.context === "Phòng ngừa", "Context should be 'Phòng ngừa'");

const testNewbornHam = classifyContent({
  title: "Review các loại kem trị hăm tã cho trẻ sơ sinh tại TP.HCM",
  url: "/review-kem-ham-ta-tre-so-sinh-tphcm"
});
assert(testNewbornHam.subtopic === "Hăm tã", "Subtopic should be 'Hăm tã'");
assert(testNewbornHam.context === "Review", "Context should be 'Review'");
assert(testNewbornHam.location === "TP.HCM", "Location should be 'TP.HCM'");

const testPostpartumMilk = classifyContent({
  title: "Hướng dẫn thực đơn ở cữ lợi sữa cho mẹ sau sinh",
  url: "/thuc-don-o-cu-loi-sua"
});
assert(testPostpartumMilk.topic === "Ở CỮ" || testPostpartumMilk.topic === "MẸ SAU SINH", "Topic should match Ở CỮ or MẸ SAU SINH");
assert(testPostpartumMilk.context === "Hướng dẫn", "Context should be 'Hướng dẫn'");

// 3. TEST SEO AUDIT
console.log("\n--- 3. Testing SEO Audit Engine ---");
const mockPages: Record<string, PageData> = {
  "https://example.com/": {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 120,
    depth: 0,
    title: "Trang chủ dịch vụ chăm sóc mẹ và bé uy tín chuyên nghiệp hàng đầu hiện nay", // > 60 chars
    metaDescription: "", // Missing meta description
    h1: ["Chăm sóc mẹ và bé"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/",
    wordCount: 500,
    boldKeywords: ["chăm sóc mẹ và bé"],
    totalInternalLinks: 3,
    totalExternalLinks: 0,
    inlinks: [],
    outlinks: [
      { toUrl: "https://example.com/dich-vu/tam-be-so-sinh-tai-nha-ha-noi-uy-tin-chuyen-nghiep-gia-re", anchorText: "Tắm bé tại nhà", isExternal: false },
      { toUrl: "https://example.com/blog/bai-viet-1", anchorText: "Bài viết 1", isExternal: false },
      { toUrl: "https://example.com/trang-loi-404", anchorText: "Trang lỗi", isExternal: false }
    ],
    mainContentText: "Nội dung trang chủ giới thiệu về dịch vụ chăm sóc mẹ và bé sơ sinh uy tín với các chuyên viên giàu kinh nghiệm."
  },
  "https://example.com/dich-vu/tam-be-so-sinh-tai-nha-ha-noi-uy-tin-chuyen-nghiep-gia-re": {
    url: "https://example.com/dich-vu/tam-be-so-sinh-tai-nha-ha-noi-uy-tin-chuyen-nghiep-gia-re", // 83 chars > 60!
    finalUrl: "https://example.com/dich-vu/tam-be-so-sinh-tai-nha-ha-noi-uy-tin-chuyen-nghiep-gia-re",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 150,
    depth: 1,
    title: "Dịch vụ tắm bé tại nhà Hà Nội giá rẻ",
    metaDescription: "Dịch vụ tắm bé sơ sinh tại nhà ở Hà Nội chuyên nghiệp tận tâm.",
    h1: [], // Missing H1!
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/dich-vu/tam-be-so-sinh-tai-nha-ha-noi-uy-tin-chuyen-nghiep-gia-re",
    wordCount: 150,
    boldKeywords: ["tắm bé tại nhà"],
    totalInternalLinks: 1,
    totalExternalLinks: 0,
    inlinks: [{ fromUrl: "https://example.com/", anchorText: "Tắm bé tại nhà" }],
    outlinks: [],
    mainContentText: "Bài viết ngắn về tắm bé tại nhà."
  },
  "https://example.com/blog/bai-viet-1": {
    url: "https://example.com/blog/bai-viet-1",
    finalUrl: "https://example.com/blog/bai-viet-1",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 110,
    depth: 1,
    title: "Cách chăm sóc mẹ sau sinh",
    metaDescription: "Cách chăm sóc mẹ sau sinh khoa học.",
    h1: ["Chăm sóc mẹ sau sinh", "Cách phục hồi cơ thể"], // Multiple H1!
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/blog/bai-viet-1",
    wordCount: 600,
    boldKeywords: [],
    totalInternalLinks: 1,
    totalExternalLinks: 0,
    inlinks: [{ fromUrl: "https://example.com/", anchorText: "Bài viết 1" }],
    outlinks: [],
    mainContentText: "Hướng dẫn phục hồi cơ thể sau khi sinh con và kiêng cữ đúng cách."
  },
  "https://example.com/blog/bai-viet-trung-lap": {
    url: "https://example.com/blog/bai-viet-trung-lap",
    finalUrl: "https://example.com/blog/bai-viet-trung-lap",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 110,
    depth: 2,
    title: "Cách chăm sóc mẹ sau sinh", // Duplicate Title!
    metaDescription: "Cách chăm sóc mẹ sau sinh khoa học.",
    h1: ["Chăm sóc mẹ sau sinh"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/blog/bai-viet-trung-lap",
    wordCount: 600,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [], // Orphan page!
    outlinks: [],
    mainContentText: "Hướng dẫn phục hồi cơ thể sau khi sinh con và kiêng cữ đúng cách." // Duplicate content!
  },
  "https://example.com/trang-loi-404": {
    url: "https://example.com/trang-loi-404",
    finalUrl: "https://example.com/trang-loi-404",
    statusCode: 404, // 404!
    contentType: "text/html",
    crawlTimeMs: 90,
    depth: 1,
    title: "404 Not Found",
    metaDescription: "",
    h1: [],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "",
    wordCount: 10,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [{ fromUrl: "https://example.com/", anchorText: "Trang lỗi" }],
    outlinks: [],
    mainContentText: "404 Not Found"
  }
};

const auditReport = performSEOAudit(mockPages);
console.log("Audit summary:", auditReport.summary);
assert(auditReport.summary.statusCode404 === 1, "Should detect 1 page with 404");
assert(auditReport.summary.titleTooLong === 1, "Should detect 1 title too long > 60 chars");
assert(auditReport.summary.urlTooLong >= 1, "Should detect URL > 60 chars");
assert(auditReport.summary.missingMetaDescription === 1, "Should detect 1 missing meta description");
assert(auditReport.summary.missingH1 === 1, "Should detect 1 missing H1");
assert(auditReport.summary.multipleH1 === 1, "Should detect 1 multiple H1");
assert(auditReport.summary.duplicateTitle >= 2, "Should detect duplicate title");
assert(auditReport.summary.duplicateContent >= 2, "Should detect duplicate content");

// 4. TEST SITE STRUCTURE
console.log("\n--- 4. Testing Site Structure Analyzer ---");
const structureReport = buildSiteStructure(mockPages, "https://example.com/");
console.log("ASCII Tree:\n" + structureReport.asciiTree);
assert(structureReport.orphanPages.length === 1, "Should detect 1 orphan page");
assert(structureReport.orphanPages[0].url === "https://example.com/blog/bai-viet-trung-lap", "Orphan page URL must match");
assert(structureReport.depthDistribution[0] === 1, "Homepage depth 0");
assert(structureReport.sectionsSummary.some(s => s.section === "/dich-vu"), "Section /dich-vu exists");
assert(structureReport.sectionsSummary.some(s => s.section === "/blog"), "Section /blog exists");

// 5. TEST CONTENT RATIO
console.log("\n--- 5. Testing Content Ratio & Gaps ---");
const classifiedMock = Object.values(mockPages).map(p => classifyContent({
  url: p.url,
  title: p.title,
  mainText: p.mainContentText
}));
const ratioReport = computeContentRatio(classifiedMock);
console.log("Top Topic:", ratioReport.topTopic);
assert(ratioReport.totalArticles === 5, "Total articles = 5");
assert(ratioReport.topTopic !== null, "Top topic calculated");
assert(ratioReport.topicDistributions.length > 0, "Topic distributions generated");
assert(ratioReport.contentGaps.length > 0, "Content gaps identified");

// 6. TEST DATE EXTRACTION (PUBLISHED & MODIFIED DATES)
console.log("\n--- 6. Testing Published & Modified Dates Extraction ---");
const { extractPageData } = require("../src/crawler/extractor");

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Dịch vụ tắm bé tại nhà</title>
  <meta property="article:published_time" content="2023-11-20T08:30:00+07:00" />
  <meta property="article:modified_time" content="2024-03-15T14:45:00+07:00" />
</head>
<body>
  <h1>Tắm bé sơ sinh</h1>
  <p>Nội dung bài viết tắm bé chu đáo...</p>
</body>
</html>
`;

const extractedData = extractPageData(sampleHtml, "https://example.com/tam-be", "https://example.com/tam-be", 200, "text/html", 50, 1, "example.com");
assert(extractedData.publishedTime.startsWith("2023-11-20"), "Should extract publishedTime from article:published_time");
assert(extractedData.modifiedTime.startsWith("2024-03-15"), "Should extract modifiedTime from article:modified_time");

// 7. TEST IN-CONTENT LINK EXTRACTION (IGNORING HEADER & FOOTER)
console.log("\n--- 7. Testing In-Content Link Extraction (Excluding Header & Footer) ---");
const pageWithHeaderFooter = `
<!DOCTYPE html>
<html>
<head><title>Bài viết chuẩn SEO</title></head>
<body>
  <header>
    <nav>
      <a href="/trang-chu">Trang chủ</a>
      <a href="/gioi-thieu">Giới thiệu</a>
      <a href="/dich-vu">Dịch vụ</a>
      <a href="/lien-he">Liên hệ</a>
    </nav>
  </header>
  <article class="entry-content">
    <h1>Bí quyết chăm sóc mẹ sau sinh</h1>
    <p>Nội dung bài viết chi tiết...</p>
    <a href="/dich-vu-tam-be">Dịch vụ tắm bé tại nhà</a>
    <a href="https://google.com" target="_blank">Tìm hiểu thêm trên Google</a>
  </article>
  <footer>
    <a href="/chinh-sach">Chính sách bảo mật</a>
    <a href="/dieu-khoan">Điều khoản sử dụng</a>
    <a href="https://facebook.com/fanpage">Facebook</a>
  </footer>
</body>
</html>
`;
const articleData = extractPageData(pageWithHeaderFooter, "https://example.com/bai-viet-chuan", "https://example.com/bai-viet-chuan", 200, "text/html", 50, 1, "example.com");
assert(articleData.totalInternalLinks === 1, `In-content internal links should be 1 (excluding header/footer), got ${articleData.totalInternalLinks}`);
assert(articleData.totalExternalLinks === 1, `In-content external links should be 1 (excluding footer), got ${articleData.totalExternalLinks}`);
assert(articleData.isArticle === true, "Should recognize this page as an article");

// 8. TEST SOFT 404 DETECTION IN AUDIT
console.log("\n--- 8. Testing Soft 404 Detection in SEO Audit ---");
const soft404Pages: Record<string, PageData> = {
  "https://example.com/dead-plugin-redirect": {
    url: "https://example.com/dead-plugin-redirect",
    finalUrl: "https://example.com/",
    statusCode: 200,
    isSoft404: true,
    isArticle: false,
    contentType: "text/html",
    crawlTimeMs: 100,
    depth: 1,
    title: "Trang chủ",
    metaDescription: "Trang chủ",
    h1: ["Trang chủ"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/",
    wordCount: 500,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [],
    outlinks: [],
    mainContentText: "Nội dung trang chủ..."
  }
};
const softAudit = performSEOAudit(soft404Pages);
assert(softAudit.summary.statusCode404 === 1, "Soft 404 must be counted as 404 error");
assert(softAudit.summary.duplicateContent === 0, "Soft 404 must NOT be checked or counted as duplicate content");

// 9. TEST REDIRECT & CANONICAL EXCLUSION FROM DUPLICATE CONTENT
console.log("\n--- 9. Testing Redirect & Canonical Exclusion from Duplicate Content ---");
const identicalArticleText = "Nội dung bài viết rất dài và chi tiết về quy trình chăm sóc mẹ và bé sau sinh toàn diện chuẩn y khoa tại nhà... ".repeat(20);

const testRedirectDupPages: Record<string, PageData> = {
  // Page 1: Canonical Master Page
  "https://example.com/blog/bai-viet-goc": {
    url: "https://example.com/blog/bai-viet-goc",
    finalUrl: "https://example.com/blog/bai-viet-goc",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 100,
    depth: 1,
    title: "Bài viết gốc chuẩn SEO",
    metaDescription: "Mô tả bài viết gốc",
    h1: ["Bài viết gốc"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/blog/bai-viet-goc",
    wordCount: 300,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [],
    outlinks: [],
    mainContentText: identicalArticleText
  },
  // Page 2: Variation page with Canonical pointing to Page 1
  "https://example.com/blog/bai-viet-bien-the-canonical": {
    url: "https://example.com/blog/bai-viet-bien-the-canonical",
    finalUrl: "https://example.com/blog/bai-viet-bien-the-canonical",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 100,
    depth: 2,
    title: "Bài viết biến thể có canonical",
    metaDescription: "Mô tả biến thể",
    h1: ["Bài viết gốc"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/blog/bai-viet-goc", // Chuyển hướng Canonical về bài viết gốc!
    wordCount: 300,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [],
    outlinks: [],
    mainContentText: identicalArticleText
  },
  // Page 3: URL that redirected (finalUrl differs from url)
  "https://example.com/blog/bai-viet-chuyen-huong": {
    url: "https://example.com/blog/bai-viet-chuyen-huong",
    finalUrl: "https://example.com/blog/bai-viet-dich-den",
    statusCode: 200,
    contentType: "text/html",
    crawlTimeMs: 100,
    depth: 2,
    title: "Bài viết chuyển hướng",
    metaDescription: "Mô tả",
    h1: ["Bài viết đích"],
    headings: { h2: [], h3: [], h4: [] },
    metaRobots: "",
    canonical: "https://example.com/blog/bai-viet-dich-den",
    wordCount: 300,
    boldKeywords: [],
    totalInternalLinks: 0,
    totalExternalLinks: 0,
    inlinks: [],
    outlinks: [],
    mainContentText: identicalArticleText
  }
};

const redirectAudit = performSEOAudit(testRedirectDupPages);
const dupContentIssues = redirectAudit.issuesByCategory.content.filter(i => i.type === "DUPLICATE_CONTENT");
assert(dupContentIssues.length === 0, `Trang có chuyển hướng hoặc canonical không được tính là trùng lặp nội dung (mong muốn 0 lỗi, nhận được ${dupContentIssues.length})`);
assert(redirectAudit.summary.duplicateContent === 0, "Summary duplicateContent phải bằng 0 khi đã có canonical/redirect");

// 10. TEST STRICT ARTICLE FILTERING (EXCLUDING PAGINATION, ARCHIVES, LOGIN)
console.log("\n--- 10. Testing Strict Article Filtering (Excluding Pagination, Archive, Login) ---");
const { isNonArticleUrlOrTitle } = require("../src/crawler/extractor");

// Test user specific cases from images
assert(
  isNonArticleUrlOrTitle("https://homecaresausinh.com/tin-tuc/page/1", "https://homecaresausinh.com/tin-tuc/page/1", "Lưu trữ Tin tức - Home Care - Dịch Vụ & Sản Phẩm") === true,
  "Pagination page /tin-tuc/page/1 must NOT be recognized as an article"
);

assert(
  isNonArticleUrlOrTitle("https://homecaresausinh.com/trung-tam-o-cu/page/1", "https://homecaresausinh.com/trung-tam-o-cu/page/1", "Lưu trữ Trung tâm ở cữ - Home Care - Dịch Vụ & Sản Phẩm") === true,
  "Pagination page /trung-tam-o-cu/page/1 must NOT be recognized as an article"
);

assert(
  isNonArticleUrlOrTitle(
    "https://homecaresausinh.com/loginzek?redirect_to=https%3A%2F%2Fhomecaresausinh.com",
    "https://homecaresausinh.com/loginzek?redirect_to=https%3A%2F%2Fhomecaresausinh.com",
    "Tiếp tục ‹ Home Care – Dịch Vụ & Sản Phẩm"
  ) === true,
  "Login redirect URL /loginzek must NOT be recognized as an article"
);

assert(
  isNonArticleUrlOrTitle(
    "https://homecaresausinh.com/tin-tuc",
    "https://homecaresausinh.com/tin-tuc/",
    "Lưu trữ Tin tức - Home Care - Dịch Vụ & Sản Phẩm"
  ) === true,
  "Category archive root /tin-tuc must NOT be recognized as an article"
);

assert(
  isNonArticleUrlOrTitle(
    "https://homecaresausinh.com/dich-vu-tam-be-tai-nha-ha-noi-gia-bao-nhieu",
    "https://homecaresausinh.com/dich-vu-tam-be-tai-nha-ha-noi-gia-bao-nhieu",
    "Dịch vụ tắm bé tại nhà Hà Nội giá bao nhiêu?"
  ) === false,
  "Genuine post URL must be recognized as an article"
);

// Test Internal Links CSV export skips pagination and login pages
const { generateInternalLinksCSV } = require("../src/utils/report");
const testSessionWithArchives: any = {
  id: "test_archive_filter",
  rootUrl: "https://homecaresausinh.com",
  startTime: new Date().toISOString(),
  durationMs: 100,
  options: {},
  pages: {
    "https://homecaresausinh.com/tin-tuc/page/1": {
      url: "https://homecaresausinh.com/tin-tuc/page/1",
      finalUrl: "https://homecaresausinh.com/tin-tuc/page/1",
      statusCode: 200,
      title: "Lưu trữ Tin tức - Home Care - Dịch Vụ & Sản Phẩm",
      isArticle: false,
      outlinks: [{ toUrl: "https://homecaresausinh.com/bai-1", anchorText: "Bài 1", isExternal: false }]
    },
    "https://homecaresausinh.com/loginzek?redirect_to=https%3A%2F%2Fhomecaresausinh.com": {
      url: "https://homecaresausinh.com/loginzek?redirect_to=https%3A%2F%2Fhomecaresausinh.com",
      finalUrl: "https://homecaresausinh.com/loginzek?redirect_to=https%3A%2F%2Fhomecaresausinh.com",
      statusCode: 200,
      title: "Tiếp tục ‹ Home Care – Dịch Vụ & Sản Phẩm",
      isArticle: false,
      outlinks: [{ toUrl: "https://homecaresausinh.com/quen-mat-khau", anchorText: "Quên mật khẩu", isExternal: false }]
    },
    "https://homecaresausinh.com/bai-viet-that": {
      url: "https://homecaresausinh.com/bai-viet-that",
      finalUrl: "https://homecaresausinh.com/bai-viet-that",
      statusCode: 200,
      title: "Hướng dẫn chăm sóc trẻ sơ sinh",
      isArticle: true,
      outlinks: [{ toUrl: "https://homecaresausinh.com/dich-vu-tam-be", anchorText: "tắm bé sơ sinh", isExternal: false }]
    }
  },
  errors: []
};

const internalLinksOutput = generateInternalLinksCSV(testSessionWithArchives);
assert(!internalLinksOutput.includes("tin-tuc/page/1"), "Internal Links CSV must NOT contain /tin-tuc/page/1 as source");
assert(!internalLinksOutput.includes("loginzek"), "Internal Links CSV must NOT contain loginzek as source");
assert(internalLinksOutput.includes("bai-viet-that"), "Internal Links CSV MUST contain real article bai-viet-that as source");

// 11. TEST STRICT BREADCRUMB EXCLUSION FROM IN-CONTENT LINKS
console.log("\n--- 11. Testing Strict Breadcrumb Exclusion from In-Content Links ---");
const pageWithBreadcrumbHtml = `
<!DOCTYPE html>
<html>
<head><title>Sản dịch sau sinh có nguy hiểm cho mẹ không?</title></head>
<body>
  <main id="main">
    <div class="zek_page_body">
      <div class="container">
        <div class="zek_breadcrum">
          <div id="breadcrumbs">
            <span>
              <span>
                <a href="https://homecaresausinh.com/">Trang chủ</a> / 
                <a href="https://homecaresausinh.com/tin-tuc/">Tin tức</a> / 
                <a href="https://homecaresausinh.com/tin-tuc/chia-se-tu-van/">Chia Sẻ & Tư Vấn</a> / 
                <span class="breadcrumb_last">Sản dịch sau sinh có nguy hiểm cho mẹ không?</span>
              </span>
            </span>
          </div>
        </div>
        <div class="zek_content">
          <h1>Sản dịch sau sinh có nguy hiểm cho mẹ không?</h1>
          <div id="toc_container" class="ez-toc-container">
            <span class="ez-toc-title">Mục Lục</span>
            <ul>
              <li><a href="#san-dich-la-gi">1. Sản dịch sau sinh là gì?</a></li>
              <li><a href="#khi-nao-het">2. Sau khi sinh bao lâu thì hết?</a></li>
            </ul>
          </div>
          <p>Sản dịch là dịch từ buồng tử cung và bộ phận sinh dục chảy ra sau khi mẹ hoàn thành ca sinh...</p>
          <p>Để hồi phục tốt, các mẹ có thể tham khảo <a href="https://homecaresausinh.com/dich-vu-cham-soc-me-sau-sinh">dịch vụ chăm sóc mẹ sau sinh tại nhà</a> rất uy tín.</p>
        </div>
      </div>
    </div>
  </main>
</body>
</html>
`;

const parsedPostData = extractPageData(
  pageWithBreadcrumbHtml,
  "https://homecaresausinh.com/san-dich-sau-sinh-co-nguy-hiem-cho-me-khong",
  "https://homecaresausinh.com/san-dich-sau-sinh-co-nguy-hiem-cho-me-khong",
  200,
  "text/html",
  50,
  1,
  "homecaresausinh.com"
);

assert(
  !parsedPostData.outlinks.some((l: any) => l.anchorText.toLowerCase().includes("trang chủ")),
  "Outlinks must NOT contain breadcrumb 'Trang chủ'"
);
assert(
  !parsedPostData.outlinks.some((l: any) => l.anchorText.toLowerCase().includes("tin tức")),
  "Outlinks must NOT contain breadcrumb 'Tin tức'"
);
assert(
  !parsedPostData.outlinks.some((l: any) => l.anchorText.toLowerCase().includes("chia sẻ & tư vấn")),
  "Outlinks must NOT contain breadcrumb 'Chia Sẻ & Tư Vấn'"
);
assert(
  !parsedPostData.outlinks.some((l: any) => l.toUrl.includes("#san-dich-la-gi")),
  "Outlinks must NOT contain Table of Contents hash link"
);
assert(
  parsedPostData.outlinks.some((l: any) => l.toUrl === "https://homecaresausinh.com/dich-vu-cham-soc-me-sau-sinh"),
  "Outlinks MUST contain legitimate in-content internal link"
);
assert(
  parsedPostData.totalInternalLinks === 1,
  `Total internal links should be exactly 1, got ${parsedPostData.totalInternalLinks}`
);

// --- 12. Testing In-Content Brand Link to Homepage vs True Soft 404 ---
console.log(`\n--- 12. Testing In-Content Brand Link to Homepage vs Soft 404 ---`);

const articleWithBrandLinkHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Địa chỉ massage body bầu cho cơ thể nhẹ bẫng</title>
</head>
<body>
  <div class="zek_breadcrum">
    <a href="https://homecaresausinh.com/">Trang chủ</a> / <span>Dịch vụ bầu</span>
  </div>
  <main class="post-content">
    <h1>Địa chỉ massage body bầu cho cơ thể nhẹ bẫng</h1>
    <p>Thấu hiểu được điều này, <a href="https://homecaresausinh.com/">Home Care</a> đem đến dịch vụ tận tâm.</p>
    <p>Mẹ có thể tham khảo thêm sản phẩm <a href="https://homecaresausinh.com/san-pham-da-xoa">tinh dầu dừa</a> đã xóa.</p>
  </main>
</body>
</html>
`;

const parsedBrandData = extractPageData(
  articleWithBrandLinkHtml,
  "https://homecaresausinh.com/dia-chi-massage-body-bau",
  "https://homecaresausinh.com/dia-chi-massage-body-bau",
  200,
  "text/html",
  50,
  1,
  "homecaresausinh.com"
);

assert(
  parsedBrandData.outlinks.some((l: any) => l.toUrl === "https://homecaresausinh.com/" && l.anchorText === "Home Care"),
  "Outlinks MUST contain legitimate in-content brand link to homepage"
);
assert(
  !parsedBrandData.outlinks.some((l: any) => l.anchorText.toLowerCase() === "trang chủ"),
  "Outlinks must NOT contain breadcrumb 'Trang chủ'"
);

// Mock a crawl session with:
// 1. Homepage (200 OK)
// 2. The article
// 3. A dead product that redirected to homepage (Soft 404)
const mockSession: any = {
  id: "test-session-brand",
  rootUrl: "https://homecaresausinh.com",
  startTime: new Date().toISOString(),
  pages: {
    "https://homecaresausinh.com/": {
      url: "https://homecaresausinh.com/",
      finalUrl: "https://homecaresausinh.com/",
      statusCode: 200,
      title: "Home Care - Dịch Vụ Chăm Sóc Mẹ & Bé Sau Sinh",
      isArticle: false,
      outlinks: []
    },
    "https://homecaresausinh.com/dia-chi-massage-body-bau": parsedBrandData,
    "https://homecaresausinh.com/san-pham-da-xoa": {
      url: "https://homecaresausinh.com/san-pham-da-xoa",
      finalUrl: "https://homecaresausinh.com/",
      statusCode: 404,
      isSoft404: true,
      title: "Home Care - Dịch Vụ Chăm Sóc Mẹ & Bé Sau Sinh",
      isArticle: false,
      outlinks: []
    }
  }
};

const csvOutput = generateInternalLinksCSV(mockSession);
assert(
  csvOutput.includes("Home Care"),
  "CSV MUST contain in-content brand link 'Home Care' pointing to homepage"
);
assert(
  csvOutput.includes("https://homecaresausinh.com/dia-chi-massage-body-bau"),
  "CSV MUST contain source article URL"
);
assert(
  !csvOutput.includes("Trang chủ"),
  "CSV must NOT contain breadcrumb link 'Trang chủ'"
);

const auditReport12 = performSEOAudit(mockSession.pages);
const allIssues12 = [
  ...auditReport12.issuesByCategory.status,
  ...auditReport12.issuesByCategory.links,
  ...auditReport12.issuesByCategory.meta,
  ...auditReport12.issuesByCategory.content,
  ...auditReport12.issuesByCategory.indexing
];

const brandLinkBrokenIssue = allIssues12.find(
  (i: any) => i.type === "BROKEN_INTERNAL_LINK" && i.details?.brokenTarget === "https://homecaresausinh.com/"
);
assert(
  !brandLinkBrokenIssue,
  "Direct link to root homepage 'Home Care' MUST NOT be flagged as BROKEN_INTERNAL_LINK"
);

const soft404BrokenIssue = allIssues12.find(
  (i: any) => i.type === "BROKEN_INTERNAL_LINK" && i.details?.brokenTarget === "https://homecaresausinh.com/san-pham-da-xoa"
);
assert(
  Boolean(soft404BrokenIssue),
  "Link to deleted product redirecting to homepage MUST be flagged as BROKEN_INTERNAL_LINK (Soft 404)"
);

// 13. TEST BLOCKQUOTE LINKS & EXTERNAL LINKS CSV EXPORT
console.log("\n--- 13. Testing Blockquote Links & External Links CSV Export ---");
const { generateExternalLinksCSV } = require("../src/utils/report");

const sampleBqHtml = `
<html>
  <body>
    <article>
      <h1>3 Gia Đình Review Dịch Vụ Ở Cữ Tại Trung Tâm Home Care</h1>
      <p>Bài viết chia sẻ trải nghiệm dịch vụ chăm sóc sau sinh.</p>
      <blockquote>
        <p><em>Xem nhiều <a href="https://www.youtube.com/playlist?list=PLvH8Db325Kdf6wr1NVHtqFX7DepaNLT9J">video review dịch vụ ở cữ tại trung tâm Home Care Luxury</a> &lt;&lt; tại đây.</em></p>
      </blockquote>
      <blockquote>
        <p>Xem thêm dịch vụ: <a href="https://homecaresausinh.com/dich-vu-tam-be-tai-nha/">Dịch vụ tắm bé tại nhà uy tín</a>.</p>
      </blockquote>
    </article>
  </body>
</html>
`;

const parsedBqData = extractPageData(
  sampleBqHtml,
  "https://homecaresausinh.com/3-gia-dinh-chia-se-dich-vu-o-cu-tai-trung-tam-home-care",
  "https://homecaresausinh.com/3-gia-dinh-chia-se-dich-vu-o-cu-tai-trung-tam-home-care",
  200,
  "text/html",
  50,
  1,
  "homecaresausinh.com"
);

assert(
  parsedBqData.totalInternalLinks === 1,
  `Internal link in blockquote must be counted (expected 1, got ${parsedBqData.totalInternalLinks})`
);
assert(
  parsedBqData.totalExternalLinks === 1,
  `External YouTube link in blockquote must be counted (expected 1, got ${parsedBqData.totalExternalLinks})`
);

const ytLink = parsedBqData.outlinks.find((o: any) => o.toUrl.includes("youtube.com"));
assert(
  Boolean(ytLink),
  "Outlinks must contain YouTube link from blockquote"
);
assert(
  ytLink.anchorText === "video review dịch vụ ở cữ tại trung tâm Home Care Luxury",
  `Anchor text must match YouTube review link, got: '${ytLink?.anchorText}'`
);

const intBqLink = parsedBqData.outlinks.find((o: any) => o.toUrl.includes("dich-vu-tam-be-tai-nha"));
assert(
  Boolean(intBqLink),
  "Outlinks must contain internal link from blockquote"
);

const bqMockSession: any = {
  id: "test_bq_session",
  rootUrl: "https://homecaresausinh.com",
  startTime: new Date().toISOString(),
  durationMs: 100,
  options: {},
  pages: {
    "https://homecaresausinh.com/3-gia-dinh-chia-se-dich-vu-o-cu-tai-trung-tam-home-care": parsedBqData,
    "https://homecaresausinh.com/dich-vu-tam-be-tai-nha/": {
      url: "https://homecaresausinh.com/dich-vu-tam-be-tai-nha/",
      finalUrl: "https://homecaresausinh.com/dich-vu-tam-be-tai-nha/",
      statusCode: 200,
      title: "Dịch Vụ Tắm Bé Tại Nhà",
      isArticle: true,
      outlinks: []
    }
  }
};

const extCsvOutput = generateExternalLinksCSV(bqMockSession);
assert(
  extCsvOutput.includes("youtube.com"),
  "External CSV MUST contain domain youtube.com"
);
assert(
  extCsvOutput.includes("video review dịch vụ ở cữ tại trung tâm Home Care Luxury"),
  "External CSV MUST contain anchor text from blockquote"
);
assert(
  extCsvOutput.includes("Video / YouTube"),
  "External CSV MUST classify YouTube links properly"
);

const intCsvFromBq = generateInternalLinksCSV(bqMockSession);
assert(
  intCsvFromBq.includes("Dịch vụ tắm bé tại nhà uy tín"),
  "Internal CSV MUST contain internal link from blockquote"
);

// 14. TEST PUBLISHED & MODIFIED DATES IN INTERNAL & EXTERNAL LINKS REPORTS
console.log("\n--- 14. Testing Published & Modified Dates in Internal & External Links Reports ---");
const { generateComprehensiveExcelWorkbook } = require("../src/utils/report");
const ExcelJS = require("exceljs");

const dateTestSession: any = {
  id: "test_date_session",
  rootUrl: "https://homecaresausinh.com",
  startTime: new Date().toISOString(),
  durationMs: 100,
  options: {},
  pages: {
    "https://homecaresausinh.com/bai-viet-ngay-thang": {
      url: "https://homecaresausinh.com/bai-viet-ngay-thang",
      finalUrl: "https://homecaresausinh.com/bai-viet-ngay-thang",
      statusCode: 200,
      title: "Bài Viết Có Ngày Đăng Và Cập Nhật",
      publishedTime: "2024-03-01 08:30",
      modifiedTime: "2024-03-05 14:20",
      isArticle: true,
      totalInternalLinks: 1,
      totalExternalLinks: 1,
      inlinks: [],
      outlinks: [
        {
          toUrl: "https://homecaresausinh.com/dich-vu-tam-be",
          anchorText: "dịch vụ tắm bé tại nhà",
          isExternal: false
        },
        {
          toUrl: "https://youtube.com/watch?v=sample123",
          anchorText: "xem video thực tế",
          isExternal: true
        }
      ]
    },
    "https://homecaresausinh.com/dich-vu-tam-be": {
      url: "https://homecaresausinh.com/dich-vu-tam-be",
      finalUrl: "https://homecaresausinh.com/dich-vu-tam-be",
      statusCode: 200,
      title: "Dịch Vụ Tắm Bé",
      isArticle: true,
      inlinks: [{ fromUrl: "https://homecaresausinh.com/bai-viet-ngay-thang", anchorText: "dịch vụ tắm bé tại nhà" }],
      outlinks: []
    }
  },
  errors: []
};

// Check Internal Links CSV
const dateIntCsv = generateInternalLinksCSV(dateTestSession);
assert(dateIntCsv.includes("Ngày đăng") && dateIntCsv.includes("Ngày cập nhật cuối"), "Internal CSV header must contain 'Ngày đăng' and 'Ngày cập nhật cuối'");
assert(dateIntCsv.includes("2024-03-01 08:30"), "Internal CSV row must contain published date '2024-03-01 08:30'");
assert(dateIntCsv.includes("2024-03-05 14:20"), "Internal CSV row must contain modified date '2024-03-05 14:20'");

// Check External Links CSV
const dateExtCsv = generateExternalLinksCSV(dateTestSession);
assert(dateExtCsv.includes("Ngày đăng") && dateExtCsv.includes("Ngày cập nhật cuối"), "External CSV header must contain 'Ngày đăng' and 'Ngày cập nhật cuối'");
assert(dateExtCsv.includes("2024-03-01 08:30"), "External CSV row must contain published date '2024-03-01 08:30'");
assert(dateExtCsv.includes("2024-03-05 14:20"), "External CSV row must contain modified date '2024-03-05 14:20'");

// Check Comprehensive Excel Workbook Sheet 5 and Sheet 6
(async () => {
  const classifications: any = {};
  for (const [u, p] of Object.entries(dateTestSession.pages as Record<string, any>)) {
    if (p.isArticle) {
      classifications[u] = classifyContent({ title: p.title, url: u });
    }
  }
  const auditMock = performSEOAudit(dateTestSession.pages);
  const structureMock = buildSiteStructure(dateTestSession.pages, dateTestSession.rootUrl);
  const ratioMock = computeContentRatio(Object.values(classifications));

  const excelBuffer = await generateComprehensiveExcelWorkbook(
    dateTestSession,
    auditMock,
    structureMock,
    ratioMock,
    Object.values(classifications)
  );
  assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 0, "Excel generator must return non-empty buffer");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(excelBuffer);

  const ws5 = wb.getWorksheet("5. Liên Kết Nội Bộ");
  assert(Boolean(ws5), "Workbook must have sheet '5. Liên Kết Nội Bộ'");
  const ws5HeaderRow = ws5.getRow(2).values as any[];
  assert(ws5HeaderRow[4] === "Ngày đăng", `Sheet 5 column 4 must be 'Ngày đăng', got '${ws5HeaderRow[4]}'`);
  assert(ws5HeaderRow[5] === "Ngày cập nhật cuối", `Sheet 5 column 5 must be 'Ngày cập nhật cuối', got '${ws5HeaderRow[5]}'`);
  const ws5DataRow = ws5.getRow(3).values as any[];
  assert(ws5DataRow[4] === "2024-03-01 08:30", `Sheet 5 row 1 published date must match, got '${ws5DataRow[4]}'`);
  assert(ws5DataRow[5] === "2024-03-05 14:20", `Sheet 5 row 1 modified date must match, got '${ws5DataRow[5]}'`);

  const ws6 = wb.getWorksheet("6. Liên Kết Ngoài");
  assert(Boolean(ws6), "Workbook must have sheet '6. Liên Kết Ngoài'");
  const ws6HeaderRow = ws6.getRow(2).values as any[];
  assert(ws6HeaderRow[4] === "Ngày đăng", `Sheet 6 column 4 must be 'Ngày đăng', got '${ws6HeaderRow[4]}'`);
  assert(ws6HeaderRow[5] === "Ngày cập nhật cuối", `Sheet 6 column 5 must be 'Ngày cập nhật cuối', got '${ws6HeaderRow[5]}'`);
  const ws6DataRow = ws6.getRow(3).values as any[];
  assert(ws6DataRow[4] === "2024-03-01 08:30", `Sheet 6 row 1 published date must match, got '${ws6DataRow[4]}'`);
  assert(ws6DataRow[5] === "2024-03-05 14:20", `Sheet 6 row 1 modified date must match, got '${ws6DataRow[5]}'`);

  // 15. TEST AI PROMPT BUILDER & AGGREGATOR (20-YEAR SEO VETERAN PERSONA)
  console.log("\n--- 15. Testing AI Prompt Builder & Aggregator (20-Year SEO Veteran Persona) ---");
  const { buildSEOExpertPrompt, aggregateCrawlStats } = require("../src/ai/promptBuilder");
  const { testLLMConnection } = require("../src/ai/llmService");

  const aggregated = aggregateCrawlStats(
    dateTestSession,
    auditMock,
    structureMock,
    ratioMock,
    Object.values(classifications)
  );

  assert(aggregated.totalPages === 2, "Aggregated total pages should be 2");
  assert(aggregated.totalArticles === 2, "Aggregated total articles should be 2");
  assert(aggregated.avgInternalLinksPerArticle === 0.5, "Average internal links per article should be 0.5");
  assert(aggregated.contentGaps.length > 0, "Aggregated content gaps must be populated");
  assert(aggregated.articlesWithZeroInlinks === 1, "Articles with 0 inlinks must be detected");
  assert(aggregated.articlesWithOneInlink === 1, "Articles with 1 inlink must be detected");

  const expertPrompts = buildSEOExpertPrompt(
    dateTestSession,
    auditMock,
    structureMock,
    ratioMock,
    Object.values(classifications)
  );

  assert(expertPrompts.systemPrompt.includes("20 NĂM KINH NGHIỆM"), "System prompt must contain 20 years experience persona");
  assert(expertPrompts.systemPrompt.includes("QUY ĐỊNH BẮT BUỘC VỀ NỘI DUNG"), "System prompt must contain YMYL content policy rules");
  assert(expertPrompts.systemPrompt.includes("tốt nhất") && expertPrompts.systemPrompt.includes("chữa bệnh"), "System prompt must specify prohibited words");
  assert(expertPrompts.systemPrompt.includes("1. ĐÁNH GIÁ TỔNG QUAN HIỆN TRẠNG SEO"), "System prompt must mandate Section 1");
  assert(expertPrompts.systemPrompt.includes("2. PHÂN TÍCH CONTENT GAP & TỐI ƯU TOPIC CLUSTER"), "System prompt must mandate Section 2 (Content Gap)");
  assert(expertPrompts.systemPrompt.includes("3. PHÂN TÍCH LINK GAP & KIẾN TRÚC LIÊN KẾT NỘI BỘ"), "System prompt must mandate Section 3 (Link Gap)");
  assert(expertPrompts.systemPrompt.includes("4. LỘ TRÌNH HÀNH ĐỘNG: TOP VIỆC NÊN LÀM NGAY"), "System prompt must mandate Section 4");
  assert(expertPrompts.systemPrompt.includes("5. CẢNH BÁO NGUY HIỂM"), "System prompt must mandate Section 5 (What NOT to do)");

  assert(expertPrompts.userPrompt.includes("CONTENT GAPS"), "User prompt must contain Content Gaps data");
  assert(expertPrompts.userPrompt.includes("LINK GAP"), "User prompt must contain Link Gap data");
  assert(expertPrompts.userPrompt.includes("homecaresausinh.com"), "User prompt must contain target site domain");

  // Test connection validation with empty API key
  const invalidKeyResult = await testLLMConnection({
    provider: "gemini",
    apiKey: "",
    model: "gemini-2.5-flash"
  });
  assert(invalidKeyResult.success === false, "testLLMConnection with empty API key must return success: false");

  console.log(`\n=========================================`);
  console.log(`TESTS FINISHED: ${passed}/${total} PASSED`);
  console.log(`=========================================`);
})();



