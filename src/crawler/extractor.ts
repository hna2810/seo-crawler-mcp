import * as cheerio from "cheerio";
import { cleanText, countWords } from "../utils/text";
import { PageData, Outlink } from "./types";

export function extractPageData(
  html: string,
  url: string,
  finalUrl: string,
  statusCode: number,
  contentType: string,
  crawlTimeMs: number,
  depth: number,
  baseDomain: string
): PageData {
  const $ = cheerio.load(html);

  // 1. Meta & Titles
  const title = cleanText($("title").first().text() || "");
  const metaDesc = cleanText(
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  );

  const metaRobots = cleanText(
    $('meta[name="robots"]').attr("content") ||
    $('meta[name="googlebot"]').attr("content") ||
    ""
  );

  const canonicalRaw = $('link[rel="canonical"]').attr("href") || "";
  let canonical = "";
  if (canonicalRaw) {
    try {
      canonical = new URL(canonicalRaw, finalUrl).toString();
    } catch {
      canonical = canonicalRaw;
    }
  }

  // 2. Headings
  const h1List: string[] = [];
  $("h1").each((_, el) => {
    const txt = cleanText($(el).text());
    if (txt) h1List.push(txt);
  });

  const h2List: string[] = [];
  $("h2").each((_, el) => {
    const txt = cleanText($(el).text());
    if (txt) h2List.push(txt);
  });

  const h3List: string[] = [];
  $("h3").each((_, el) => {
    const txt = cleanText($(el).text());
    if (txt) h3List.push(txt);
  });

  const h4List: string[] = [];
  $("h4").each((_, el) => {
    const txt = cleanText($(el).text());
    if (txt) h4List.push(txt);
  });

  // 3. Bold Keywords (<strong>, <b>)
  const boldKeywordsSet = new Set<string>();
  $("strong, b").each((_, el) => {
    const txt = cleanText($(el).text());
    if (txt && txt.length > 2 && txt.length < 100) {
      boldKeywordsSet.add(txt);
    }
  });

  // 4. Discovery Links (Trích xuất toàn bộ liên kết trên toàn trang bao gồm menu, header, footer để crawler duyệt web)
  const discoveryLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;

    if (
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:")
    ) {
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
    } catch {}
  });

  // 5. Content extraction for Word Count & Semantic Classification
  // Find the post/article content container without re-parsing the entire HTML tree
  const $articleTarget = $("article, .entry-content, .post-content, .single-post-content, .content-detail, .post-detail, .td-post-content, main, #main, #content").first();
  let $articleContainer = $articleTarget.length > 0 ? $articleTarget.clone() : $("body").clone();

  // Remove boilerplate from the container clone
  $articleContainer.find(
    "script, style, nav, footer, header, aside, form, svg, noscript, iframe, button, " +
    ".header, .footer, .site-header, .site-footer, .main-navigation, .menu, .navbar, .nav, " +
    ".sidebar, #sidebar, .widget, #comments, .comments-area, .breadcrumbs, .breadcrumb, " +
    ".social-share, .share-box, .related-posts, .author-box, .elementor-location-header, .elementor-location-footer"
  ).remove();

  if ($articleContainer.text().trim().length < 50 && $articleTarget.length > 0) {
    $articleContainer = $("body").clone();
    $articleContainer.find(
      "script, style, nav, footer, header, aside, form, svg, noscript, iframe, button, " +
      ".header, .footer, .site-header, .site-footer, .main-navigation, .menu, .navbar, .nav, " +
      ".sidebar, #sidebar, .widget, #comments, .comments-area, .breadcrumbs, .breadcrumb, " +
      ".social-share, .share-box, .related-posts, .author-box, .elementor-location-header, .elementor-location-footer"
    ).remove();
  }

  const cleanMainText = cleanText($articleContainer.text());
  const wordCount = countWords(cleanMainText);

  // 6. In-Content Links & Anchor text (CHỈ tính trong phần nội dung bài viết, KHÔNG tính header/footer)
  const outlinks: Outlink[] = [];
  let totalInternalLinks = 0;
  let totalExternalLinks = 0;

  $articleContainer.find("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;

    if (
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:")
    ) {
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
      const anchorText = cleanText($(el).text());
      const isExternal = resolved.hostname !== baseDomain && !resolved.hostname.endsWith("." + baseDomain);

      if (isExternal) {
        totalExternalLinks++;
      } else {
        totalInternalLinks++;
      }

      outlinks.push({
        toUrl,
        anchorText,
        isExternal
      });
    } catch {
      // Invalid URL
    }
  });

  // Determine if this is an article/post vs utility/archive/login/functional page
  const isArticle = checkIfArticlePage(url, finalUrl, statusCode, title, $);

  // 6. Publication & Modified Dates (Ngày đăng bài & Ngày cập nhật gần nhất)
  let rawPublished =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="article:published_time"]').attr("content") ||
    $('meta[property="og:published_time"]').attr("content") ||
    $('meta[name="pubdate"]').attr("content") ||
    $('meta[name="publishdate"]').attr("content") ||
    $('meta[name="date"]').attr("content") ||
    "";

  let rawModified =
    $('meta[property="article:modified_time"]').attr("content") ||
    $('meta[name="article:modified_time"]').attr("content") ||
    $('meta[property="og:updated_time"]').attr("content") ||
    "";

  // Check Schema JSON-LD (Rank Math, Yoast SEO, Schema.org Article/BlogPosting)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (rawPublished && rawModified) return;
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : (data["@graph"] || [data]);
      for (const item of items) {
        if (!rawPublished && item.datePublished) rawPublished = String(item.datePublished);
        if (!rawModified && item.dateModified) rawModified = String(item.dateModified);
      }
    } catch {}
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
    mainContentText: cleanMainText.slice(0, 8000)
  };
}

function formatDateTime(str: string): string {
  if (!str) return "";
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
  } catch {}
  return str.slice(0, 19).replace("T", " ");
}

/**
 * Robust filter to identify URLs or Titles that are definitely NOT single articles:
 * - Pagination (/page/1, /page/2, ?paged=1)
 * - Category / Taxonomy / Tag / Author / Archives (/category/, /tag/, /chuyen-muc/, /luu-tru/)
 * - WordPress archive titles ("Lưu trữ Tin tức...", "Chuyên mục: ...")
 * - Login / Admin / Security login custom slugs (loginzek, wp-login, ?redirect_to=)
 * - WordPress login titles ("Tiếp tục ‹ Home Care...", "Đăng nhập")
 * - Utility, Cart, Checkout, Policies, Contact, Search, Homepage
 * - Category root landing pages (/tin-tuc/, /blog/, /dich-vu/, /san-pham/)
 */
export function isNonArticleUrlOrTitle(url?: string, finalUrl?: string, title?: string): boolean {
  const tLower = (title || "").toLowerCase().trim();

  // 1. Title checks (Archive, Category, Tag, Author, Login, Homepage, Soft 404)
  if (
    tLower.startsWith("lưu trữ") ||
    tLower.includes(" - lưu trữ") ||
    tLower.includes(" | lưu trữ") ||
    tLower.startsWith("archives:") ||
    tLower.startsWith("archive:") ||
    tLower.startsWith("chuyên mục:") ||
    tLower.startsWith("category:") ||
    tLower.startsWith("thẻ:") ||
    tLower.startsWith("tag:") ||
    tLower.startsWith("tác giả:") ||
    tLower.startsWith("author:") ||
    tLower.startsWith("danh mục:") ||
    tLower.includes("kết quả tìm kiếm") ||
    tLower.startsWith("tiếp tục ‹") ||
    tLower.startsWith("tiếp tục <") ||
    tLower.startsWith("đăng nhập") ||
    tLower.startsWith("log in") ||
    tLower.includes("quên mật khẩu") ||
    tLower.startsWith("trang chủ") ||
    tLower === "trang chủ" ||
    tLower.includes("404 not found") ||
    tLower.includes("không tìm thấy trang") ||
    tLower.includes("trang không tồn tại")
  ) {
    return true;
  }

  // 2. URL checks on both requested url and final redirected url
  const urlsToCheck = [url, finalUrl].filter((u): u is string => Boolean(u));
  for (const uStr of urlsToCheck) {
    try {
      const parsed = new URL(uStr);
      const p = parsed.pathname.toLowerCase();
      const q = parsed.search.toLowerCase();

      // Root homepage
      if (p === "/" || p === "") return true;

      // Pagination anywhere in path or query (e.g. /page/1, /page/2, /tin-tuc/page/1, ?paged=1)
      if (/\/page\/\d+/i.test(p) || /\/page\/?$/i.test(p) || /[?&]paged?=\d+/i.test(q)) {
        return true;
      }

      // Categories, Tags, Authors, Archives
      if (
        /(\/category\/|\/chuyen-muc\/|\/danh-muc\/|\/chu-de\/|\/tag\/|\/the\/|\/tu-khoa\/|\/author\/|\/tac-gia\/|\/archives?\/|\/luu-tru\/|\/collections?\/)/i.test(p)
      ) {
        return true;
      }

      // Login, Admin, Security login slugs (loginzek, wp-login, etc.)
      if (
        /(login|dang-nhap|wp-login|wp-admin|lost-password|quen-mat-khau|reset-password)/i.test(p) ||
        /[?&](redirect_to|replytocom|action=logout|action=lostpassword)/i.test(q)
      ) {
        return true;
      }

      // Functional, Cart, Checkout, Policies, Utilities
      if (
        /\/(gio-hang|cart|checkout|thanh-toan|don-hang|order|tai-khoan|my-account|wishlist|lien-he|contact|showroom|cua-hang|shop|store|he-thong-cua-hang|gioi-thieu|about|ve-chung-toi|chinh-sach.*|policy.*|dieu-khoan.*|terms.*|quy-dinh.*|bao-mat|sitemap.*|tim-kiem|search|feed|rss)(\/|$)/i.test(p)
      ) {
        return true;
      }

      // Root category landing pages without article slug (e.g. /tin-tuc, /tin-tuc/, /blog, /dich-vu, /trung-tam-o-cu)
      const segments = p.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (
        segments.length === 1 &&
        ["tin-tuc", "blog", "news", "bai-viet", "dich-vu", "san-pham", "trung-tam-o-cu", "kien-thuc", "cam-nang"].includes(segments[0])
      ) {
        return true;
      }
    } catch {
      return true;
    }
  }

  return false;
}

export function checkIfArticlePage(
  url: string,
  finalUrl: string,
  statusCode: number,
  title: string,
  $: cheerio.CheerioAPI
): boolean {
  // 1. Status code check: only 200 OK can be an article
  if (statusCode !== 200) {
    return false;
  }

  // 2. URL or Title indicators of non-articles
  if (isNonArticleUrlOrTitle(url, finalUrl, title)) {
    return false;
  }

  // 3. HTML Body Classes & Structure (WordPress & CMS specific)
  const bodyClass = ($("body").attr("class") || "").toLowerCase();
  if (bodyClass) {
    const nonArticleClasses = [
      "archive",
      "category",
      "tag",
      "tax-",
      "post-type-archive",
      "author",
      "blog",
      "paged",
      "search",
      "login",
      "error404",
      "woocommerce-cart",
      "woocommerce-checkout",
      "woocommerce-account"
    ];
    const classList = bodyClass.split(/\s+/);
    for (const c of nonArticleClasses) {
      if (classList.some((cls: string) => cls === c || cls.startsWith(c))) {
        return false;
      }
    }
  }

  // Login form presence
  if ($("#loginform").length > 0 || $('form[name="loginform"]').length > 0 || $('input[name="log"]').length > 0) {
    return false;
  }

  // If body has single post class, it's definitely an article
  if (bodyClass.includes("single-post") || bodyClass.includes("postid-")) {
    return true;
  }

  // OpenGraph Type validation
  const ogType = ($('meta[property="og:type"]').attr("content") || "").toLowerCase().trim();
  if (ogType === "article") {
    return true;
  }

  return true;
}

