import { GoogleAdsConfig, RawKeywordIdea, fetchGoogleKeywordIdeas, generateSimulatedKeywordIdeas } from "./googleAdsService";
import { classifyContent } from "../classifier/topicClassifier";
import { LLMConfig, streamLLMAnalysis } from "../ai/llmService";

export interface CuratedKeyword {
  keyword: string;
  avgMonthlySearches: number;
  competition: "Thấp" | "Trung bình" | "Cao";
  competitionIndex: number;
  estimatedCpcRange: string;
  searchIntent: string;
  matchedTopic: string;
  matchedSubtopic: string;
  isContentGap: boolean;
  priority: "Ưu tiên cao (Viết ngay)" | "Ưu tiên trung bình" | "Tham khảo";
  aiRecommendation: string;
}

export interface ContentGapItem {
  topic: string;
  missingSubtopics?: string[];
  subtopicsWithZeroArticles?: string[];
}

export interface KeywordResearchRequest {
  userIdeas?: string;
  contentGaps?: ContentGapItem[];
  enableGaps?: boolean;
  googleAdsConfig?: GoogleAdsConfig;
  useSimulatedMetrics?: boolean;
  llmConfig?: LLMConfig;
  maxKeywords?: number;
}

export interface KeywordResearchResponse {
  seedsUsed: string[];
  totalFound: number;
  keywords: CuratedKeyword[];
  highPriorityCount: number;
  totalSearchVolume: number;
  summary: string;
}

/**
 * Generate candidate seed keywords from user input and website content gaps
 */
export async function generateSeedKeywords(
  userIdeas?: string,
  contentGaps?: ContentGapItem[],
  llmConfig?: LLMConfig
): Promise<string[]> {
  const seedsSet = new Set<string>();

  // 1. Extract from user ideas
  if (userIdeas && userIdeas.trim()) {
    const rawTokens = userIdeas
      .split(/[\n,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 1);

    rawTokens.forEach(t => seedsSet.add(t));
  }

  // 2. Extract from content gaps
  if (contentGaps && Array.isArray(contentGaps)) {
    for (const gap of contentGaps) {
      const subs = gap.missingSubtopics || gap.subtopicsWithZeroArticles || [];
      if (Array.isArray(subs)) {
        for (const sub of subs) {
          const cleanSub = String(sub).trim().toLowerCase();
          if (cleanSub && cleanSub !== "chung" && cleanSub.length > 1) {
            seedsSet.add(cleanSub);
            // Add natural search prefixes
            if (!cleanSub.includes("dịch vụ") && !cleanSub.includes("chăm sóc")) {
              seedsSet.add(`dịch vụ ${cleanSub}`);
              seedsSet.add(`cách ${cleanSub}`);
            }
          }
        }
      }
    }
  }

  // 3. Fallback defaults if no seeds provided
  if (seedsSet.size === 0) {
    [
      "tắm bé tại nhà",
      "chăm sóc mẹ sau sinh",
      "massage bầu tại nhà",
      "thông tắc tia sữa",
      "giảm eo sau sinh",
      "dịch vụ ở cữ"
    ].forEach(s => seedsSet.add(s));
  }

  const initialSeeds = Array.from(seedsSet).slice(0, 20);

  // 4. If LLM is configured, enrich seeds with search-intent variations
  if (llmConfig && llmConfig.apiKey && llmConfig.apiKey.trim().length > 0) {
    try {
      const systemPrompt = "Bạn là chuyên gia SEO Keyword Research. Hãy gợi ý danh sách từ khóa hạt giống (seed keywords) chuẩn tiếng Việt.";
      const userPrompt = `Dựa vào danh sách chủ đề và ý tưởng sau:
${initialSeeds.map(s => `- ${s}`).join("\n")}

Hãy gợi ý thêm 10 cụm từ khóa tìm kiếm thực tế mà mẹ bầu, mẹ sau sinh hoặc gia đình thường gõ trên Google tìm kiếm.
Trả về DUY NHẤT danh sách từ khóa, mỗi từ một dòng, không đánh số thứ tự, không kèm giải thích hay văn bản khác.`;

      const aiReply = await streamLLMAnalysis(llmConfig, systemPrompt, userPrompt, () => {});
      const lines = aiReply.split("\n").map(l => l.replace(/^[-*0-9.)\s]+/, "").trim().toLowerCase()).filter(l => l.length > 2);
      lines.slice(0, 10).forEach(l => seedsSet.add(l));
    } catch {
      // If LLM fails, continue with initial seeds
    }
  }

  return Array.from(seedsSet).slice(0, 25);
}

/**
 * Filter, classify and rank raw keyword ideas into actionable SEO table
 */
export function filterAndRankKeywords(
  rawKeywords: RawKeywordIdea[],
  contentGaps?: ContentGapItem[],
  maxKeywords: number = 50
): CuratedKeyword[] {
  // Build set of missing subtopics for fast lookup
  const missingSubtopicsSet = new Set<string>();
  if (contentGaps && Array.isArray(contentGaps)) {
    contentGaps.forEach(g => {
      const subs = g.missingSubtopics || g.subtopicsWithZeroArticles || [];
      if (Array.isArray(subs)) {
        subs.forEach(s => missingSubtopicsSet.add(String(s).trim().toLowerCase()));
      }
    });
  }

  const curated: CuratedKeyword[] = [];
  const seenKeywords = new Set<string>();

  for (const raw of rawKeywords) {
    const kwText = raw.text.trim().toLowerCase();
    if (!kwText || seenKeywords.has(kwText)) continue;
    seenKeywords.add(kwText);

    // Lọc bỏ triệt để các từ khóa không có lượt tìm kiếm (0 hoặc rỗng) theo yêu cầu người dùng
    if (!raw.avgMonthlySearches || raw.avgMonthlySearches <= 0) continue;

    // Classify topic and context using taxonomy
    const classif = classifyContent({ title: kwText, url: "" });
    const subtopicLower = classif.subtopic.trim().toLowerCase();

    // Check if keyword helps fill a content gap
    const isContentGap = missingSubtopicsSet.has(subtopicLower) || 
      Array.from(missingSubtopicsSet).some(gap => kwText.includes(gap) || gap.includes(kwText));

    // Map competition
    let competitionText: "Thấp" | "Trung bình" | "Cao" = "Trung bình";
    if (raw.competition === "LOW" || raw.competitionIndex < 33) {
      competitionText = "Thấp";
    } else if (raw.competition === "HIGH" || raw.competitionIndex > 66) {
      competitionText = "Cao";
    }

    // Format CPC range
    let estimatedCpcRange = "-";
    if (raw.lowBidMicros && raw.highBidMicros) {
      const lowVnd = Math.round(raw.lowBidMicros / 1000000);
      const highVnd = Math.round(raw.highBidMicros / 1000000);
      estimatedCpcRange = `${lowVnd.toLocaleString("vi-VN")} - ${highVnd.toLocaleString("vi-VN")} đ`;
    } else if (raw.lowBidMicros) {
      const vnd = Math.round(raw.lowBidMicros / 1000000);
      estimatedCpcRange = `~${vnd.toLocaleString("vi-VN")} đ`;
    }

    // Map Search Intent
    let searchIntent = "Thông tin (Hướng dẫn / Kinh nghiệm)";
    if (classif.context === "Chi phí / Giá") {
      searchIntent = "Thương mại (Chi phí / Giá dịch vụ)";
    } else if (classif.context === "Dịch vụ") {
      searchIntent = "Giao dịch (Dịch vụ tại nhà / Đặt lịch)";
    } else if (classif.context === "Review") {
      searchIntent = "Thương mại (Review / Đánh giá)";
    } else if (classif.context === "Phòng ngừa") {
      searchIntent = "Thông tin (Phòng ngừa & Chăm sóc)";
    } else if (kwText.includes("ở đâu") || kwText.includes("địa chỉ") || kwText.includes("gần đây")) {
      searchIntent = "Điều hướng (Tìm địa chỉ / Chi nhánh)";
    }

    // Priority scoring
    let priority: "Ưu tiên cao (Viết ngay)" | "Ưu tiên trung bình" | "Tham khảo" = "Tham khảo";
    if ((isContentGap && raw.avgMonthlySearches >= 50) || raw.avgMonthlySearches >= 600) {
      priority = "Ưu tiên cao (Viết ngay)";
    } else if (isContentGap || raw.avgMonthlySearches >= 150) {
      priority = "Ưu tiên trung bình";
    }

    // AI recommendation string
    let aiRecommendation = "";
    if (isContentGap) {
      aiRecommendation = `Lấp lỗ hổng [${classif.subtopic}] đang thiếu trên website`;
    } else if (classif.context === "Chi phí / Giá" || classif.context === "Dịch vụ") {
      aiRecommendation = "Bài viết dịch vụ chuyển đổi cao kèm bảng giá minh bạch";
    } else {
      aiRecommendation = "Bài viết cẩm nang chuyên sâu kéo traffic tự nhiên";
    }

    curated.push({
      keyword: raw.text,
      avgMonthlySearches: raw.avgMonthlySearches,
      competition: competitionText,
      competitionIndex: raw.competitionIndex,
      estimatedCpcRange,
      searchIntent,
      matchedTopic: classif.topic,
      matchedSubtopic: classif.subtopic,
      isContentGap,
      priority,
      aiRecommendation
    });
  }

  // Sort by priority (High -> Medium -> Low) and search volume desc
  const priorityWeight = {
    "Ưu tiên cao (Viết ngay)": 3,
    "Ưu tiên trung bình": 2,
    "Tham khảo": 1
  };

  curated.sort((a, b) => {
    const diffPriority = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (diffPriority !== 0) return diffPriority;
    return b.avgMonthlySearches - a.avgMonthlySearches;
  });

  return curated.slice(0, maxKeywords);
}

/**
 * End-to-end Keyword Research orchestrator
 */
export async function runKeywordResearch(request: KeywordResearchRequest): Promise<KeywordResearchResponse> {
  // Step 1: Generate seed keywords
  const seeds = await generateSeedKeywords(request.userIdeas, request.contentGaps, request.llmConfig);

  // Step 2: Fetch keyword ideas from Google Ads or simulated fallback
  let rawIdeas: RawKeywordIdea[] = [];
  const hasRealGoogleConfig = request.googleAdsConfig &&
    Boolean(request.googleAdsConfig.developerToken) &&
    Boolean(request.googleAdsConfig.clientId) &&
    Boolean(request.googleAdsConfig.clientSecret) &&
    Boolean(request.googleAdsConfig.refreshToken) &&
    Boolean(request.googleAdsConfig.customerId);

  if (!request.useSimulatedMetrics && hasRealGoogleConfig) {
    try {
      rawIdeas = await fetchGoogleKeywordIdeas(request.googleAdsConfig!, seeds);
    } catch (err: any) {
      throw new Error(`Google Ads Keyword Planner API lỗi: ${err.message}. Vui lòng kiểm tra lại cấu hình hoặc token.`);
    }
  } else {
    rawIdeas = generateSimulatedKeywordIdeas(seeds);
  }

  // Step 3: Filter & rank keywords
  const maxKw = request.maxKeywords || 60;
  const curated = filterAndRankKeywords(rawIdeas, request.contentGaps, maxKw);

  const highPriorityCount = curated.filter(k => k.priority === "Ưu tiên cao (Viết ngay)").length;
  const totalSearchVolume = curated.reduce((acc, k) => acc + k.avgMonthlySearches, 0);

  const gapKeywordsCount = curated.filter(k => k.isContentGap).length;
  const summary = `Nghiên cứu từ ${seeds.length} hạt giống từ khóa: tìm thấy ${curated.length} từ khóa tiềm năng với tổng ${totalSearchVolume.toLocaleString("vi-VN")} lượt tìm kiếm/tháng. Trong đó có ${gapKeywordsCount} từ khóa giúp lấp đầy trực tiếp các Content Gap của website và ${highPriorityCount} từ khóa khuyến nghị nên viết bài ngay.`;

  return {
    seedsUsed: seeds,
    totalFound: curated.length,
    keywords: curated,
    highPriorityCount,
    totalSearchVolume,
    summary
  };
}
