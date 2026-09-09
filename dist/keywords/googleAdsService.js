"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAdsAccessToken = getGoogleAdsAccessToken;
exports.testGoogleAdsConnection = testGoogleAdsConnection;
exports.fetchGoogleKeywordIdeas = fetchGoogleKeywordIdeas;
exports.generateSimulatedKeywordIdeas = generateSimulatedKeywordIdeas;
const axios_1 = __importDefault(require("axios"));
/**
 * Exchange OAuth2 refresh token for a short-lived access token
 */
async function getGoogleAdsAccessToken(config) {
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams();
    params.append("client_id", config.clientId.trim());
    params.append("client_secret", config.clientSecret.trim());
    params.append("refresh_token", config.refreshToken.trim());
    params.append("grant_type", "refresh_token");
    try {
        const res = await axios_1.default.post(tokenUrl, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 10000
        });
        if (res.data && res.data.access_token) {
            return res.data.access_token;
        }
        throw new Error("Không nhận được access_token từ Google OAuth2");
    }
    catch (err) {
        const errMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
        throw new Error(`Lỗi xác thực OAuth2 Google Ads: ${errMsg}`);
    }
}
/**
 * Test Google Ads credentials by exchanging refresh token
 */
async function testGoogleAdsConnection(config) {
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
            return {
                success: true,
                message: "Kết nối thành công! Đã xác thực OAuth2 và sẵn sàng truy vấn Google Keyword Planner."
            };
        }
        return { success: false, message: "Không thể lấy Access Token từ Google" };
    }
    catch (err) {
        return {
            success: false,
            message: err.message || "Lỗi kiểm tra kết nối Google Ads API"
        };
    }
}
/**
 * Fetch keyword ideas from Google Ads API (generateKeywordIdeas)
 */
async function fetchGoogleKeywordIdeas(config, seedKeywords) {
    const cleanCustomerId = config.customerId.replace(/[^0-9]/g, "");
    if (!cleanCustomerId) {
        throw new Error("Customer ID không hợp lệ. Vui lòng nhập ID 10 chữ số (vd: 123-456-7890)");
    }
    const accessToken = await getGoogleAdsAccessToken(config);
    const geoTarget = config.geoTarget || "geoTargetConstants/2704"; // Vietnam
    const language = config.language || "languageConstants/1040"; // Vietnamese
    // Google Ads API limits keywordSeed to max 20 keywords per request
    const limitedSeeds = seedKeywords.slice(0, 20);
    const endpoint = `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}:generateKeywordIdeas`;
    const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": config.developerToken.trim(),
        "Content-Type": "application/json"
    };
    if (config.loginCustomerId) {
        headers["login-customer-id"] = config.loginCustomerId.replace(/[^0-9]/g, "");
    }
    const payload = {
        keywordSeed: {
            keywords: limitedSeeds
        },
        geoTargetConstants: [geoTarget],
        keywordPlanNetwork: "GOOGLE_SEARCH",
        language: language
    };
    try {
        const res = await axios_1.default.post(endpoint, payload, { headers, timeout: 30000 });
        const results = res.data.results || [];
        const parsed = results.map((item) => {
            const metrics = item.keywordIdeaMetrics || {};
            return {
                text: item.text,
                avgMonthlySearches: Number(metrics.avgMonthlySearches || 0),
                competition: metrics.competition || "UNSPECIFIED",
                competitionIndex: Number(metrics.competitionIndex || 0),
                lowBidMicros: metrics.lowTopOfPageBidMicros ? Number(metrics.lowTopOfPageBidMicros) : undefined,
                highBidMicros: metrics.highTopOfPageBidMicros ? Number(metrics.highTopOfPageBidMicros) : undefined
            };
        });
        return parsed;
    }
    catch (err) {
        const apiError = err.response?.data?.error?.message || err.message;
        throw new Error(`Google Ads API generateKeywordIdeas thất bại: ${apiError}`);
    }
}
/**
 * Generate intelligent estimated metrics for seed keywords
 * Useful for immediate testing when user doesn't have an approved Google Ads Developer Token yet
 */
function generateSimulatedKeywordIdeas(seedKeywords) {
    const result = [];
    const added = new Set();
    const baseTerms = [
        "tại nhà", "uy tín", "giá bao nhiêu", "trọn gói", "ở đâu tốt",
        "kinh nghiệm", "hướng dẫn", "cho mẹ bầu", "sau sinh", "chuẩn y khoa",
        "bảng giá 2026", "review", "chuyên nghiệp", "an toàn"
    ];
    for (const seed of seedKeywords) {
        const cleanSeed = seed.trim().toLowerCase();
        if (!cleanSeed)
            continue;
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
function getDeterministicHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}
