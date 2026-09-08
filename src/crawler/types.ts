export interface CrawlProgress {
  crawledCount: number;
  totalQueued: number;
  currentUrl: string;
  statusCode: number;
  speedPagesPerSec: number;
  elapsedSec: number;
  status: "running" | "completed" | "stopped" | "error";
  error?: string;
}

export interface CrawlOptions {
  url: string;
  mode?: "full" | "sitemap" | "fast";
  sitemapUrl?: string;
  maxDepth?: number;
  maxPages?: number;
  includePattern?: string;
  excludePattern?: string;
  concurrency?: number;
  delayMs?: number;
  userAgent?: string;
  respectRobots?: boolean;
  onProgress?: (progress: CrawlProgress) => void;
}

export interface Inlink {
  fromUrl: string;
  anchorText: string;
}

export interface Outlink {
  toUrl: string;
  anchorText: string;
  isExternal: boolean;
}

export interface PageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  crawlTimeMs: number;
  depth: number;
  
  // SEO On-page
  title: string;
  metaDescription: string;
  h1: string[];
  headings: {
    h2: string[];
    h3: string[];
    h4: string[];
  };
  metaRobots: string;
  canonical: string;
  wordCount: number;
  boldKeywords: string[];
  publishedTime?: string;
  modifiedTime?: string;
  isSoft404?: boolean;
  isArticle?: boolean;
  
  // Links
  totalInternalLinks: number;
  totalExternalLinks: number;
  inlinks: Inlink[];
  outlinks: Outlink[];
  discoveryLinks?: string[];
  
  // Extracted raw text for classification
  mainContentText: string;
}

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory = "status" | "meta" | "content" | "indexing" | "links";

export interface SEOIssue {
  url: string;
  category: IssueCategory;
  severity: IssueSeverity;
  type: string;
  message: string;
  details?: Record<string, any>;
}

export interface SiteNode {
  path: string;
  segment: string;
  url?: string;
  title?: string;
  depth: number;
  pageCount: number;
  children: Record<string, SiteNode>;
}

export interface ClassificationResult {
  url: string;
  title: string;
  publishedTime?: string;
  modifiedTime?: string;
  topic: string;
  subtopic: string;
  specificTopic?: string;
  context?: string;
  location?: string;
  confidence: number; // 0 to 1
  matchedKeywords: string[];
}

export interface TopicDistribution {
  topic: string;
  count: number;
  ratio: number; // percentage e.g. 25.5%
  subtopics: {
    subtopic: string;
    count: number;
    ratio: number;
  }[];
}

export interface CrawlSessionSummary {
  id: string;
  rootUrl: string;
  startTime: string;
  endTime?: string;
  totalPagesCrawled: number;
  totalErrors: number;
  durationMs: number;
  options: CrawlOptions;
  statusBreakdown: Record<number, number>;
}
