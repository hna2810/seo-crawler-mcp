import axios, { AxiosInstance } from "axios";
import https from "https";
import http from "http";
import { CrawlOptions, PageData, Inlink } from "./types";
import { extractPageData } from "./extractor";
import { fetchRobotsTxt, discoverSitemapUrls, fetchSitemapUrls } from "./sitemap";
import { CrawlSession, saveSession } from "./session";

export class WebsiteCrawler {
  private options: Required<Omit<CrawlOptions, "onProgress">> & { onProgress?: CrawlOptions["onProgress"] };
  private rootDomain: string;
  private visited = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private pages: Record<string, PageData> = {};
  private errors: { url: string; error: string; statusCode?: number }[] = [];
  private disallowedPaths: string[] = [];
  private isAborted = false;
  private httpClient: AxiosInstance;

  constructor(options: CrawlOptions) {
    const urlObj = new URL(options.url);
    this.rootDomain = urlObj.hostname;

    // High performance HTTP client with Keep-Alive connection pooling
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });

    this.httpClient = axios.create({
      httpsAgent,
      httpAgent,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true
    });

    this.options = {
      url: options.url,
      mode: options.mode || "full",
      sitemapUrl: options.sitemapUrl || "",
      maxDepth: options.maxDepth !== undefined ? options.maxDepth : 3,
      maxPages: options.maxPages !== undefined && options.maxPages > 0 ? options.maxPages : 1000,
      includePattern: options.includePattern || "",
      excludePattern: options.excludePattern || "",
      concurrency: options.concurrency !== undefined ? Math.max(1, Math.min(options.concurrency, 30)) : 15,
      delayMs: options.delayMs !== undefined ? options.delayMs : 0,
      userAgent: options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      respectRobots: options.respectRobots !== undefined ? options.respectRobots : true,
      onProgress: options.onProgress
    };
  }

  public abort(): void {
    this.isAborted = true;
  }

  private normalizeUrl(rawUrl: string): string {
    try {
      const u = new URL(rawUrl);
      u.hash = "";
      if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch {
      return rawUrl;
    }
  }

  private isSameDomain(targetUrl: string): boolean {
    try {
      const u = new URL(targetUrl);
      return u.hostname === this.rootDomain || u.hostname.endsWith("." + this.rootDomain);
    } catch {
      return false;
    }
  }

  private isAllowed(targetUrl: string): boolean {
    try {
      const u = new URL(targetUrl);
      const pathAndQuery = u.pathname + u.search;

      if (this.options.respectRobots) {
        for (const disallowed of this.disallowedPaths) {
          if (pathAndQuery.startsWith(disallowed)) {
            return false;
          }
        }
      }

      if (this.options.excludePattern) {
        const re = new RegExp(this.options.excludePattern, "i");
        if (re.test(targetUrl)) return false;
      }

      if (this.options.includePattern) {
        const re = new RegExp(this.options.includePattern, "i");
        if (!re.test(targetUrl)) return false;
      }

      const extMatch = u.pathname.match(/\.([a-z0-9]+)$/i);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        const nonHtmlExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "pdf", "zip", "rar", "mp4", "mp3", "css", "js", "json", "xml", "woff", "woff2", "ttf"];
        if (nonHtmlExts.includes(ext)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  public async crawl(): Promise<CrawlSession> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();
    const sessionId = "crawl_" + Date.now();

    // 1. Robots.txt
    if (this.options.respectRobots) {
      const robots = await fetchRobotsTxt(this.options.url, this.options.userAgent);
      this.disallowedPaths = robots.disallowedPaths;
    }

    // 2. Populate initial queue
    const normalizedRoot = this.normalizeUrl(this.options.url);
    this.queue.push({ url: normalizedRoot, depth: 0 });

    // Seed sitemap URLs for fast discovery
    try {
      let sitemapUrls: string[] = [];
      if (this.options.sitemapUrl) {
        sitemapUrls = await fetchSitemapUrls(this.options.sitemapUrl, this.options.maxPages);
      } else {
        sitemapUrls = await discoverSitemapUrls(this.options.url, this.options.maxPages);
      }

      for (const smUrl of sitemapUrls) {
        const norm = this.normalizeUrl(smUrl);
        if (this.isSameDomain(norm) && this.isAllowed(norm) && !this.queue.some(q => q.url === norm)) {
          this.queue.push({ url: norm, depth: 1 });
        }
      }
    } catch {
      // Ignore sitemap discovery error
    }

    // 3. Worker queue execution with High Concurrency Pool
    const concurrency = Math.max(1, Math.min(this.options.concurrency, 30));
    const activeWorkers: Promise<void>[] = [];
    let activeFetchingCount = 0;
    let isDone = false;
    let lastProgressNotifyMs = 0;

    const notifyProgress = (currentUrl: string, statusCode: number) => {
      const now = Date.now();
      const crawledCount = Object.keys(this.pages).length;
      if (this.options.onProgress && (now - lastProgressNotifyMs >= 120 || crawledCount % 10 === 0)) {
        lastProgressNotifyMs = now;
        const elapsedSec = Math.max(0.1, (now - startMs) / 1000);
        const speed = Number((crawledCount / elapsedSec).toFixed(1));
        this.options.onProgress({
          crawledCount,
          totalQueued: this.queue.length + crawledCount,
          currentUrl,
          statusCode,
          speedPagesPerSec: speed,
          elapsedSec: Math.round(elapsedSec),
          status: "running"
        });
      }
    };

    const worker = async () => {
      while (!isDone && !this.isAborted) {
        if (Object.keys(this.pages).length >= this.options.maxPages) {
          isDone = true;
          break;
        }

        const item = this.queue.shift();
        if (!item) {
          // If queue is empty:
          // If no workers are currently fetching, then no more URLs will ever be found -> crawl is done!
          if (activeFetchingCount === 0) {
            isDone = true;
            break;
          }
          // Otherwise wait for other active workers to finish and potentially add links
          await new Promise(res => setTimeout(res, 50));
          continue;
        }

        const currentUrl = item.url;
        if (this.visited.has(currentUrl)) continue;
        this.visited.add(currentUrl);

        activeFetchingCount++;
        try {
          await this.crawlSinglePage(currentUrl, item.depth, startMs, notifyProgress);
        } catch {
          // Error already recorded in crawlSinglePage
        } finally {
          activeFetchingCount--;
        }

        if (this.options.delayMs > 0) {
          await new Promise(res => setTimeout(res, this.options.delayMs));
        }
      }
    };

    for (let i = 0; i < concurrency; i++) {
      activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);

    // 4. Build inlink graph across all pages
    this.reconstructInlinks();

    const durationMs = Date.now() - startMs;
    const session: CrawlSession = {
      id: sessionId,
      rootUrl: this.options.url,
      startTime,
      endTime: new Date().toISOString(),
      durationMs,
      options: this.options,
      pages: this.pages,
      errors: this.errors
    };

    saveSession(session);

    if (this.options.onProgress) {
      const elapsedSec = Math.max(0.1, durationMs / 1000);
      this.options.onProgress({
        crawledCount: Object.keys(this.pages).length,
        totalQueued: this.queue.length + Object.keys(this.pages).length,
        currentUrl: this.isAborted ? "Đã dừng theo yêu cầu" : "Hoàn thành quét",
        statusCode: 200,
        speedPagesPerSec: Number((Object.keys(this.pages).length / elapsedSec).toFixed(1)),
        elapsedSec: Math.round(elapsedSec),
        status: this.isAborted ? "stopped" : "completed"
      });
    }

    return session;
  }

  private async crawlSinglePage(
    targetUrl: string,
    depth: number,
    startMs: number,
    notifyProgress: (url: string, status: number) => void
  ): Promise<void> {
    const pageStartMs = Date.now();
    let res: any = null;
    let fetchError: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await this.httpClient.get(targetUrl, {
          headers: {
            "User-Agent": this.options.userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          timeout: 12000
        });
        fetchError = null;
        break;
      } catch (err: any) {
        fetchError = err;
        if (attempt === 0 && !this.isAborted) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    if (fetchError || !res) {
      const crawlTimeMs = Date.now() - pageStartMs;
      const errStatus = fetchError?.response?.status || 0;
      this.errors.push({
        url: targetUrl,
        error: fetchError?.message || "Failed to fetch URL",
        statusCode: errStatus
      });

      this.pages[targetUrl] = {
        url: targetUrl,
        finalUrl: targetUrl,
        statusCode: errStatus,
        contentType: "",
        crawlTimeMs,
        depth,
        title: "",
        metaDescription: "",
        h1: [],
        headings: { h2: [], h3: [], h4: [] },
        metaRobots: "",
        canonical: "",
        wordCount: 0,
        boldKeywords: [],
        publishedTime: "",
        modifiedTime: "",
        totalInternalLinks: 0,
        totalExternalLinks: 0,
        inlinks: [],
        outlinks: [],
        mainContentText: ""
      };

      notifyProgress(targetUrl, errStatus);
      return;
    }

    try {
      const crawlTimeMs = Date.now() - pageStartMs;
      const rawContentType = res.headers["content-type"];
      const contentType = typeof rawContentType === "string" ? rawContentType : Array.isArray(rawContentType) ? rawContentType.join(";") : "";
      const statusCode = res.status;
      const finalUrl = res.request?.res?.responseUrl || targetUrl;

      // Non-html responses
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        this.pages[targetUrl] = {
          url: targetUrl,
          finalUrl,
          statusCode,
          contentType,
          crawlTimeMs,
          depth,
          title: "",
          metaDescription: "",
          h1: [],
          headings: { h2: [], h3: [], h4: [] },
          metaRobots: "",
          canonical: "",
          wordCount: 0,
          boldKeywords: [],
          publishedTime: "",
          modifiedTime: "",
          totalInternalLinks: 0,
          totalExternalLinks: 0,
          inlinks: [],
          outlinks: [],
          mainContentText: ""
        };
        notifyProgress(targetUrl, statusCode);
        return;
      }

      let effectiveStatusCode = statusCode;
      let isSoft404 = false;

      // Soft 404 Detection (404-to-homepage plugins, 404 redirects)
      try {
        const targetParsed = new URL(targetUrl);
        const finalParsed = new URL(finalUrl);
        const targetPath = targetParsed.pathname.replace(/\/+$/, "");
        const finalPath = finalParsed.pathname.replace(/\/+$/, "");

        // If a non-root URL redirected to homepage root "/", it's a soft 404!
        if (targetPath !== "" && finalPath === "") {
          effectiveStatusCode = 404;
          isSoft404 = true;
        }
      } catch {}

      if (effectiveStatusCode >= 400) {
        this.errors.push({
          url: targetUrl,
          error: isSoft404 ? "Soft 404 (Redirect to Homepage)" : `HTTP status ${effectiveStatusCode}`,
          statusCode: effectiveStatusCode
        });
      }

      const pageData = extractPageData(
        typeof res.data === "string" ? res.data : "",
        targetUrl,
        finalUrl,
        effectiveStatusCode,
        contentType,
        crawlTimeMs,
        depth,
        this.rootDomain
      );

      if (isSoft404) {
        pageData.isSoft404 = true;
        pageData.isArticle = false;
      } else if (pageData.statusCode === 200) {
        const titleLower = pageData.title.toLowerCase();
        if (
          titleLower.includes("404 not found") ||
          titleLower.includes("page not found") ||
          titleLower.includes("không tìm thấy trang") ||
          titleLower.startsWith("404 -") ||
          titleLower.startsWith("404:")
        ) {
          pageData.statusCode = 404;
          pageData.isSoft404 = true;
          pageData.isArticle = false;
        }
      }

      this.pages[targetUrl] = pageData;

      // Queue new internal links
      if (depth < this.options.maxDepth && this.options.mode !== "sitemap") {
        for (const outlink of pageData.outlinks) {
          if (!outlink.isExternal) {
            const nextUrl = this.normalizeUrl(outlink.toUrl);
            if (
              this.isSameDomain(nextUrl) &&
              this.isAllowed(nextUrl) &&
              !this.visited.has(nextUrl) &&
              !this.queue.some(q => q.url === nextUrl)
            ) {
              if (Object.keys(this.pages).length + this.queue.length < this.options.maxPages * 1.5) {
                this.queue.push({ url: nextUrl, depth: depth + 1 });
              }
            }
          }
        }
      }

      notifyProgress(targetUrl, effectiveStatusCode);
    } catch (err: any) {
      const crawlTimeMs = Date.now() - pageStartMs;
      const errStatus = err.response?.status || 0;
      this.errors.push({
        url: targetUrl,
        error: err.message || "Failed to fetch URL",
        statusCode: errStatus
      });

      this.pages[targetUrl] = {
        url: targetUrl,
        finalUrl: targetUrl,
        statusCode: errStatus,
        contentType: "",
        crawlTimeMs,
        depth,
        title: "",
        metaDescription: "",
        h1: [],
        headings: { h2: [], h3: [], h4: [] },
        metaRobots: "",
        canonical: "",
        wordCount: 0,
        boldKeywords: [],
        publishedTime: "",
        modifiedTime: "",
        totalInternalLinks: 0,
        totalExternalLinks: 0,
        inlinks: [],
        outlinks: [],
        mainContentText: ""
      };

      notifyProgress(targetUrl, errStatus);
    }
  }

  private reconstructInlinks(): void {
    const inlinksMap: Record<string, Inlink[]> = {};

    for (const [sourceUrl, page] of Object.entries(this.pages)) {
      for (const out of page.outlinks) {
        if (!out.isExternal) {
          const normTarget = this.normalizeUrl(out.toUrl);
          if (!inlinksMap[normTarget]) {
            inlinksMap[normTarget] = [];
          }
          inlinksMap[normTarget].push({
            fromUrl: sourceUrl,
            anchorText: out.anchorText
          });
        }
      }
    }

    for (const [url, inlinks] of Object.entries(inlinksMap)) {
      if (this.pages[url]) {
        this.pages[url].inlinks = inlinks;
      }
    }
  }
}
