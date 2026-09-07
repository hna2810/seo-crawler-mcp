import { ClassificationResult, TopicDistribution } from "../crawler/types";
import { MOTHER_BABY_TAXONOMY } from "../config/taxonomy";

export interface ContentRatioReport {
  totalArticles: number;
  topTopic: { topic: string; count: number; ratio: number } | null;
  topSubtopic: { topic: string; subtopic: string; count: number; ratio: number } | null;
  topicDistributions: TopicDistribution[];
  contextBreakdown: { context: string; count: number; ratio: number }[];
  locationBreakdown: { location: string; count: number; ratio: number }[];
  contentGaps: { topic: string; subtopicsWithZeroArticles: string[] }[];
}

export function computeContentRatio(classifications: ClassificationResult[]): ContentRatioReport {
  const totalArticles = classifications.length;
  if (totalArticles === 0) {
    return {
      totalArticles: 0,
      topTopic: null,
      topSubtopic: null,
      topicDistributions: [],
      contextBreakdown: [],
      locationBreakdown: [],
      contentGaps: []
    };
  }

  // Topic & Subtopic counts
  const topicCounts: Record<string, number> = {};
  const subtopicCounts: Record<string, Record<string, number>> = {};
  const contextCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};

  for (const item of classifications) {
    // Topic
    topicCounts[item.topic] = (topicCounts[item.topic] || 0) + 1;

    // Subtopic
    if (!subtopicCounts[item.topic]) {
      subtopicCounts[item.topic] = {};
    }
    subtopicCounts[item.topic][item.subtopic] = (subtopicCounts[item.topic][item.subtopic] || 0) + 1;

    // Context
    if (item.context) {
      contextCounts[item.context] = (contextCounts[item.context] || 0) + 1;
    } else {
      contextCounts["Chưa xác định"] = (contextCounts["Chưa xác định"] || 0) + 1;
    }

    // Location
    if (item.location) {
      locationCounts[item.location] = (locationCounts[item.location] || 0) + 1;
    } else {
      locationCounts["Toàn quốc / Chung"] = (locationCounts["Toàn quốc / Chung"] || 0) + 1;
    }
  }

  // Build TopicDistributions
  const topicDistributions: TopicDistribution[] = [];
  let maxTopicCount = 0;
  let topTopicName = "";

  let maxSubtopicCount = 0;
  let topSubtopicInfo = { topic: "", subtopic: "" };

  for (const [topicName, count] of Object.entries(topicCounts)) {
    const ratio = Number(((count / totalArticles) * 100).toFixed(1));
    if (count > maxTopicCount) {
      maxTopicCount = count;
      topTopicName = topicName;
    }

    const subList: { subtopic: string; count: number; ratio: number }[] = [];
    const subs = subtopicCounts[topicName] || {};
    for (const [subName, subCount] of Object.entries(subs)) {
      const subRatio = Number(((subCount / totalArticles) * 100).toFixed(1));
      if (subCount > maxSubtopicCount) {
        maxSubtopicCount = subCount;
        topSubtopicInfo = { topic: topicName, subtopic: subName };
      }
      subList.push({
        subtopic: subName,
        count: subCount,
        ratio: subRatio
      });
    }

    subList.sort((a, b) => b.count - a.count);

    topicDistributions.push({
      topic: topicName,
      count,
      ratio,
      subtopics: subList
    });
  }

  // Sort topics by article count descending
  topicDistributions.sort((a, b) => b.count - a.count);

  // Identify Content Gaps (topics and subtopics with 0 articles from taxonomy)
  const contentGaps: { topic: string; subtopicsWithZeroArticles: string[] }[] = [];
  for (const tax of MOTHER_BABY_TAXONOMY) {
    const writtenSubs = subtopicCounts[tax.name] || {};
    const missingSubs: string[] = [];
    for (const sub of tax.subtopics) {
      if (!writtenSubs[sub.name]) {
        missingSubs.push(sub.name);
      }
    }
    if (missingSubs.length > 0) {
      contentGaps.push({
        topic: tax.name,
        subtopicsWithZeroArticles: missingSubs
      });
    }
  }

  // Context Breakdown
  const contextBreakdown = Object.entries(contextCounts).map(([ctx, cnt]) => ({
    context: ctx,
    count: cnt,
    ratio: Number(((cnt / totalArticles) * 100).toFixed(1))
  })).sort((a, b) => b.count - a.count);

  // Location Breakdown
  const locationBreakdown = Object.entries(locationCounts).map(([loc, cnt]) => ({
    location: loc,
    count: cnt,
    ratio: Number(((cnt / totalArticles) * 100).toFixed(1))
  })).sort((a, b) => b.count - a.count);

  return {
    totalArticles,
    topTopic: topTopicName ? {
      topic: topTopicName,
      count: maxTopicCount,
      ratio: Number(((maxTopicCount / totalArticles) * 100).toFixed(1))
    } : null,
    topSubtopic: topSubtopicInfo.topic ? {
      topic: topSubtopicInfo.topic,
      subtopic: topSubtopicInfo.subtopic,
      count: maxSubtopicCount,
      ratio: Number(((maxSubtopicCount / totalArticles) * 100).toFixed(1))
    } : null,
    topicDistributions,
    contextBreakdown,
    locationBreakdown,
    contentGaps
  };
}
