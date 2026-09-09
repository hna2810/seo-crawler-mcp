import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

export interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
  geoTarget?: string; // e.g. "geoTargetConstants/2704" for Vietnam
  language?: string;  // e.g. "languageConstants/1040" for Vietnamese
}

export interface RawKeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  competitionIndex: number; // 0 - 100
  lowBidMicros?: number;
  highBidMicros?: number;
}

/**
 * Automatically find and load configuration from google-ads.yaml file if present
 */
export function loadGoogleAdsYamlConfig(): { found: boolean; filePath?: string; config?: Partial<GoogleAdsConfig> } {
  const candidatePaths = [
    path.resolve(process.cwd(), "google-ads.yaml"),
    path.resolve(process.cwd(), "..", "google-ads.yaml"),
    path.join(os.homedir(), "google-ads.yaml"),
    "c:\\Users\\Administrator\\Desktop\\ads\\google-ads.yaml"
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed: Record<string, string> = {};
        for (const line of raw.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf(":");
          if (idx > 0) {
            const k = trimmed.slice(0, idx).trim();
            let v = trimmed.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            parsed[k] = v;
          }
        }

        const config: Partial<GoogleAdsConfig> = {
          developerToken: parsed.developer_token || "",
          clientId: parsed.client_id || "",
          clientSecret: parsed.client_secret || "",
          refreshToken: parsed.refresh_token || "",
          customerId: parsed.customer_id || parsed.login_customer_id || "",
          loginCustomerId: parsed.login_customer_id || ""
        };

        return { found: true, filePath: p, config };
      }
    } catch {
      // ignore read error
    }
  }

  return { found: false };
}

/**
 * Exchange OAuth2 refresh token for a short-lived access token
 */
export async function getGoogleAdsAccessToken(config: GoogleAdsConfig): Promise<string> {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams();
  params.append("client_id", config.clientId.trim());
  params.append("client_secret", config.clientSecret.trim());
  params.append("refresh_token", config.refreshToken.trim());
  params.append("grant_type", "refresh_token");

  try {
    const res = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000
    });

    if (res.data && res.data.access_token) {
      return res.data.access_token;
    }
    throw new Error("Không nhận được access_token từ Google OAuth2");
  } catch (err: any) {
    const errCode = err.response?.data?.error || "";
    const errDesc = err.response?.data?.error_description || err.message;
    if (errCode === "invalid_grant" || (typeof errDesc === "string" && errDesc.includes("invalid_grant"))) {
      throw new Error("Mã Refresh Token trong file đã hết hạn (Google OAuth hết hạn sau 7-30 ngày). Bạn chỉ cần dùng Client ID & Client Secret có sẵn để lấy lại Refresh Token mới tại OAuth Playground theo Bước 4!");
    }
    throw new Error(`Lỗi xác thực OAuth2 Google Ads: ${errDesc || errCode}`);
  }
}

/**
 * Test Google Ads credentials by exchanging refresh token
 */
export async function testGoogleAdsConnection(config: GoogleAdsConfig): Promise<{ success: boolean; message: string }> {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    return {
      success: false,
      message: "Vui lòng nhập đầy đủ Client ID, Client Secret và Refresh Token"
    };
  }

  if (!config.developerToken) {
    return {
      success: false,
      message: "Vui lòng nhập Developer Token của Google Ads API"
    };
  }

  if (!config.customerId) {
    return {
      success: false,
      message: "Vui lòng nhập Customer ID (CID) tài khoản Google Ads (10 chữ số)"
    };
  }

  try {
    const accessToken = await getGoogleAdsAccessToken(config);
    if (accessToken) {
      // Test real generateKeywordIdeas if developerToken & customerId provided
      if (config.developerToken && config.customerId) {
        try {
          const cleanCustomerId = config.customerId.replace(/[^0-9]/g, "");
          const endpoint = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}:generateKeywordIdeas`;
          const headers: Record<string, string> = {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": config.developerToken.trim(),
            "Content-Type": "application/json"
          };
          if (config.loginCustomerId) {
            headers["login-customer-id"] = config.loginCustomerId.replace(/[^0-9]/g, "");
          }
          const payload = {
            customerId: cleanCustomerId,
            keywordSeed: { keywords: ["chăm sóc bé"] },
            geoTargetConstants: ["geoTargetConstants/2704"],
            keywordPlanNetwork: "GOOGLE_SEARCH",
            language: "languageConstants/1040"
          };
          await axios.post(endpoint, payload, { headers, timeout: 15000 });
          return {
            success: true,
            message: "Kết nối thành công! Đã xác thực OAuth2 và kết nối Google Ads API v22 lấy dữ liệu chính xác từ Google Keyword Planner."
          };
        } catch (apiErr: any) {
          const errMsg = apiErr.response?.data?.error?.message || apiErr.response?.data?.[0]?.error?.message || apiErr.message;
          return {
            success: false,
            message: `OAuth2 hợp lệ nhưng truy vấn Google Ads API v22 thất bại: ${errMsg}`
          };
        }
      }
      return {
        success: true,
        message: "Kết nối OAuth2 thành công!"
      };
    }
    return { success: false, message: "Không thể lấy Access Token từ Google" };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Lỗi kiểm tra kết nối Google Ads API"
    };
  }
}

/**
 * Fetch keyword ideas from Google Ads API (generateKeywordIdeas)
 */
export async function fetchGoogleKeywordIdeas(
  config: GoogleAdsConfig,
  seedKeywords: string[]
): Promise<RawKeywordIdea[]> {
  const cleanCustomerId = config.customerId.replace(/[^0-9]/g, "");
  if (!cleanCustomerId) {
    throw new Error("Customer ID không hợp lệ. Vui lòng nhập ID 10 chữ số (vd: 123-456-7890)");
  }

  const accessToken = await getGoogleAdsAccessToken(config);
  const geoTarget = config.geoTarget || "geoTargetConstants/2704"; // Vietnam
  const language = config.language || "languageConstants/1040"; // Vietnamese

  // Google Ads API limits keywordSeed to max 20 keywords per request
  const limitedSeeds = seedKeywords.slice(0, 20);

  // Phiên bản Google Ads API v22 (Active supported version năm 2026)
  const endpoint = `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}:generateKeywordIdeas`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": config.developerToken.trim(),
    "Content-Type": "application/json"
  };

  if (config.loginCustomerId) {
    headers["login-customer-id"] = config.loginCustomerId.replace(/[^0-9]/g, "");
  }

  const payload = {
    customerId: cleanCustomerId,
    keywordSeed: {
      keywords: limitedSeeds
    },
    geoTargetConstants: [geoTarget],
    keywordPlanNetwork: "GOOGLE_SEARCH",
    language: language
  };

  try {
    const res = await axios.post(endpoint, payload, { headers, timeout: 30000 });
    const results = res.data.results || [];

    // Lọc bỏ triệt để các từ khóa không có lượt tìm kiếm (0, rỗng hoặc âm)
    const validResults = results.filter((item: any) => {
      const vol = Number(item.keywordIdeaMetrics?.avgMonthlySearches || 0);
      return vol > 0;
    });

    const parsed: RawKeywordIdea[] = validResults.map((item: any) => {
      const metrics = item.keywordIdeaMetrics || {};
      let comp: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED" = "UNSPECIFIED";
      if (metrics.competition === "LOW") comp = "LOW";
      else if (metrics.competition === "MEDIUM") comp = "MEDIUM";
      else if (metrics.competition === "HIGH") comp = "HIGH";

      return {
        text: item.text,
        avgMonthlySearches: Number(metrics.avgMonthlySearches || 0),
        competition: comp,
        competitionIndex: Number(metrics.competitionIndex || 0),
        lowBidMicros: metrics.lowTopOfPageBidMicros ? Number(metrics.lowTopOfPageBidMicros) : undefined,
        highBidMicros: metrics.highTopOfPageBidMicros ? Number(metrics.highTopOfPageBidMicros) : undefined
      };
    });

    return parsed;
  } catch (err: any) {
    const apiError = err.response?.data?.error?.message || err.response?.data?.[0]?.error?.message || err.message;
    throw new Error(`Google Ads API v22 generateKeywordIdeas thất bại: ${apiError}`);
  }
}

/**
 * Generate intelligent estimated metrics for seed keywords
 * Useful for immediate testing when user doesn't have an approved Google Ads Developer Token yet
 */
export function generateSimulatedKeywordIdeas(seedKeywords: string[]): RawKeywordIdea[] {
  const result: RawKeywordIdea[] = [];
  const added = new Set<string>();

  const baseTerms = [
    "tại nhà", "uy tín", "giá bao nhiêu", "trọn gói", "ở đâu tốt", 
    "kinh nghiệm", "hướng dẫn", "cho mẹ bầu", "sau sinh", "chuẩn y khoa",
    "bảng giá 2026", "review", "chuyên nghiệp", "an toàn"
  ];

  for (const seed of seedKeywords) {
    const cleanSeed = seed.trim().toLowerCase();
    if (!cleanSeed) continue;

    // Add main seed
    if (!added.has(cleanSeed)) {
      added.add(cleanSeed);
      const hash = getDeterministicHash(cleanSeed);
      result.push({
        text: cleanSeed,
        avgMonthlySearches: Math.round((hash % 4500) + 500),
        competition: hash % 3 === 0 ? "LOW" : (hash % 3 === 1 ? "MEDIUM" : "HIGH"),
        competitionIndex: (hash % 70) + 20,
        lowBidMicros: (hash % 4000 + 1000) * 1000000,
        highBidMicros: (hash % 8000 + 5000) * 1000000
      });
    }

    // Add 3-5 long-tail variations
    for (let i = 0; i < 4; i++) {
      const modifier = baseTerms[(cleanSeed.length + i * 3) % baseTerms.length];
      const longTail = `${cleanSeed} ${modifier}`;
      if (!added.has(longTail)) {
        added.add(longTail);
        const hash = getDeterministicHash(longTail);
        result.push({
          text: longTail,
          avgMonthlySearches: Math.round((hash % 1800) + 150),
          competition: hash % 2 === 0 ? "LOW" : "MEDIUM",
          competitionIndex: (hash % 50) + 15,
          lowBidMicros: (hash % 3000 + 800) * 1000000,
          highBidMicros: (hash % 6000 + 3500) * 1000000
        });
      }
    }
  }

  return result.sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
}

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cleanNumber(val: any): number {
  if (!val) return 0;
  const cleaned = val.toString().replace(/[đ\s\.%]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parsePlannerVolume(volStr: any): number {
  if (!volStr) return 0;
  const str = volStr.toString().trim().toLowerCase();
  if (!str || str === "-" || str === "–" || str === "—" || str === "0") return 0;

  // Xử lý dải lượt tìm kiếm như 10 - 100, 1k - 10k...
  if (str.includes("-") || str.includes("–")) {
    const parts = str.split(/[-–]/).map((p: string) => p.trim());
    if (parts.length >= 2) {
      const p1 = parsePlannerVolume(parts[0]);
      const p2 = parsePlannerVolume(parts[1]);
      if (p2 > 0) return Math.round((p1 + p2) / 2);
      if (p1 > 0) return p1;
    }
  }

  if (str.includes("k")) {
    return cleanNumber(str.replace(/k/g, "")) * 1000;
  }
  if (str.includes("tr") || str.includes("m")) {
    return cleanNumber(str.replace(/tr|m/g, "")) * 1000000;
  }

  return cleanNumber(str);
}

/**
 * Parse raw copied text, TSV, or CSV exported from Google Keyword Planner
 */
export function parseGoogleKeywordPlannerData(rawText: string): RawKeywordIdea[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: RawKeywordIdea[] = [];
  if (lines.length === 0) return result;

  let sep = "\t";
  const firstLine = lines[0] || "";
  if (firstLine.includes("\t")) {
    sep = "\t";
  } else if (firstLine.includes(",")) {
    sep = ",";
  } else if (firstLine.includes(";")) {
    sep = ";";
  }

  let headerIdx = -1;
  let kwCol = 0;
  let volCol = 1;
  let compCol = 4;
  let lowBidCol = 6;
  let highBidCol = 7;

  // Detect headers
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i].split(sep).map(c => c.trim().toLowerCase());
    const kIdx = cols.findIndex(c => c.includes("từ khóa") || c.includes("keyword"));
    if (kIdx !== -1) {
      headerIdx = i;
      kwCol = kIdx;
      const vIdx = cols.findIndex(c => c.includes("tìm kiếm") || c.includes("searches") || c.includes("volume"));
      if (vIdx !== -1) volCol = vIdx;
      const cIdx = cols.findIndex(c => c.includes("cạnh tranh") || c.includes("competition"));
      if (cIdx !== -1) compCol = cIdx;
      const lIdx = cols.findIndex(c => c.includes("mức giá thấp") || c.includes("low range"));
      if (lIdx !== -1) lowBidCol = lIdx;
      const hIdx = cols.findIndex(c => c.includes("mức giá cao") || c.includes("high range"));
      if (hIdx !== -1) highBidCol = hIdx;
      break;
    }
  }

  const startLine = headerIdx >= 0 ? headerIdx + 1 : 0;
  const seen = new Set<string>();

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#") || line.toLowerCase().includes("bản quyền") || line.toLowerCase().includes("tổng cộng")) continue;
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length <= kwCol) continue;

    const text = cols[kwCol];
    if (!text || text === "-" || text.toLowerCase() === "từ khóa bạn cung cấp" || text.toLowerCase() === "ý tưởng từ khóa") continue;
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());

    // Parse volume
    const volStr = cols[volCol] || "0";
    const avgMonthlySearches = parsePlannerVolume(volStr);

    // Lọc bỏ triệt để các từ khóa không có lượt tìm kiếm (0 hoặc rỗng) theo yêu cầu người dùng
    if (avgMonthlySearches <= 0) continue;

    // Parse competition
    const compRaw = (cols[compCol] || "").toLowerCase();
    let competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED" = "UNSPECIFIED";
    let compIndex = 50;
    if (compRaw.includes("thấp") || compRaw.includes("low")) {
      competition = "LOW";
      compIndex = 20;
    } else if (compRaw.includes("cao") || compRaw.includes("high")) {
      competition = "HIGH";
      compIndex = 80;
    } else if (compRaw.includes("trung bình") || compRaw.includes("medium")) {
      competition = "MEDIUM";
      compIndex = 50;
    }

    // Parse bids
    const lowBid = cleanNumber(cols[lowBidCol] || "0");
    const highBid = cleanNumber(cols[highBidCol] || "0");

    result.push({
      text,
      avgMonthlySearches,
      competition,
      competitionIndex: compIndex,
      lowBidMicros: lowBid > 0 ? lowBid * 1000000 : undefined,
      highBidMicros: highBid > 0 ? highBid * 1000000 : undefined
    });
  }

  return result;
}
