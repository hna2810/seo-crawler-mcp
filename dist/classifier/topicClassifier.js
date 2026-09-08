"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPage = classifyPage;
exports.classifyContent = classifyContent;
const taxonomy_1 = require("../config/taxonomy");
const text_1 = require("../utils/text");
function prepareKeyword(raw) {
    const kwLower = raw.toLowerCase();
    return {
        raw,
        kwLower,
        kwNoTone: (0, text_1.removeVietnameseTones)(kwLower)
    };
}
const PREPARED_TAXONOMY = taxonomy_1.MOTHER_BABY_TAXONOMY.map(topic => ({
    id: topic.id,
    name: topic.name,
    keywords: topic.keywords.map(prepareKeyword),
    subtopics: topic.subtopics.map(sub => ({
        name: sub.name,
        keywords: sub.keywords.map(prepareKeyword),
        specificTopics: sub.specificTopics?.map(spec => ({
            name: spec.name,
            keywords: spec.keywords.map(prepareKeyword)
        }))
    }))
}));
const PREPARED_LOCATIONS = taxonomy_1.LOCATION_LIST.map(loc => ({
    name: loc.name,
    aliases: loc.aliases.map(prepareKeyword)
}));
const PREPARED_CONTEXTS = taxonomy_1.CONTEXT_LIST.map(ctx => ({
    name: ctx.name,
    keywords: ctx.keywords.map(prepareKeyword)
}));
function classifyPage(page) {
    return classifyContent({
        url: page.url,
        title: page.title,
        publishedTime: page.publishedTime,
        modifiedTime: page.modifiedTime,
        h1: page.h1,
        headings: [...page.headings.h2, ...page.headings.h3, ...page.headings.h4],
        boldKeywords: page.boldKeywords,
        mainText: page.mainContentText
    });
}
function classifyContent(input) {
    const rawUrl = input.url || "";
    const title = input.title || "";
    const h1List = Array.isArray(input.h1) ? input.h1 : input.h1 ? [input.h1] : [];
    const headings = input.headings || [];
    const boldKeywords = input.boldKeywords || [];
    const mainText = input.mainText || "";
    // Prepare normalized searchable fields ONCE per content item
    const urlSlug = cleanUrlToWords(rawUrl);
    const rawFields = [
        { text: title, weight: 4.0 },
        { text: h1List.join(" "), weight: 3.5 },
        { text: boldKeywords.join(" "), weight: 2.5 },
        { text: urlSlug, weight: 2.5 },
        { text: headings.join(" "), weight: 2.0 },
        { text: mainText.slice(0, 2500), weight: 1.0 }
    ];
    const fields = [];
    for (const rf of rawFields) {
        if (!rf.text)
            continue;
        const textLower = rf.text.toLowerCase();
        fields.push({
            textLower,
            textNoTone: (0, text_1.removeVietnameseTones)(textLower),
            weight: rf.weight
        });
    }
    // 1. Classify Topic and Subtopic
    const candidates = [];
    for (const topic of PREPARED_TAXONOMY) {
        let topicScore = 0;
        const topicMatchedKeywords = [];
        // Score topic keywords
        for (const kw of topic.keywords) {
            const matchW = scoreKeywordInFields(kw, fields);
            if (matchW > 0) {
                topicScore += matchW * 1.5;
                topicMatchedKeywords.push(kw.raw);
            }
        }
        // Score subtopics within this topic
        for (const sub of topic.subtopics) {
            let subScore = 0;
            const subMatchedKeywords = [];
            let bestSpecific = undefined;
            let bestSpecificScore = 0;
            for (const kw of sub.keywords) {
                const matchW = scoreKeywordInFields(kw, fields);
                if (matchW > 0) {
                    subScore += matchW * 2.5;
                    subMatchedKeywords.push(kw.raw);
                }
            }
            // Check specific topics if available
            if (sub.specificTopics) {
                for (const spec of sub.specificTopics) {
                    for (const kw of spec.keywords) {
                        const matchW = scoreKeywordInFields(kw, fields);
                        if (matchW > 0) {
                            const specW = matchW * 3.5;
                            subScore += specW;
                            subMatchedKeywords.push(kw.raw);
                            if (specW > bestSpecificScore) {
                                bestSpecificScore = specW;
                                bestSpecific = spec.name;
                            }
                        }
                    }
                }
            }
            const totalCandidateScore = topicScore + subScore;
            if (totalCandidateScore > 0) {
                candidates.push({
                    topic,
                    subtopic: sub,
                    specificTopic: bestSpecific,
                    score: totalCandidateScore,
                    matchedKeywords: [...new Set([...topicMatchedKeywords, ...subMatchedKeywords])]
                });
            }
        }
    }
    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score);
    let selectedTopic = "MẸ BẦU / THAI KỲ";
    let selectedSubtopic = "Kiến thức thai kỳ";
    let selectedSpecificTopic = undefined;
    let confidence = 0.5;
    let matchedKeywords = [];
    if (candidates.length > 0) {
        const best = candidates[0];
        selectedTopic = best.topic.name;
        selectedSubtopic = best.subtopic ? best.subtopic.name : best.topic.subtopics[0].name;
        selectedSpecificTopic = best.specificTopic;
        matchedKeywords = best.matchedKeywords;
        if (best.score > 20) {
            confidence = Math.min(0.98, 0.85 + (best.score - 20) * 0.005);
        }
        else if (best.score > 8) {
            confidence = 0.70 + (best.score - 8) * 0.012;
        }
        else {
            confidence = Math.max(0.40, 0.45 + best.score * 0.03);
        }
    }
    // 2. Classify Location
    const locationResult = extractLocation(fields);
    // 3. Classify Context
    const contextResult = extractContext(fields);
    return {
        url: rawUrl,
        title,
        publishedTime: input.publishedTime,
        modifiedTime: input.modifiedTime,
        topic: selectedTopic,
        subtopic: selectedSubtopic,
        specificTopic: selectedSpecificTopic,
        context: contextResult,
        location: locationResult,
        confidence: Number(confidence.toFixed(2)),
        matchedKeywords
    };
}
function cleanUrlToWords(rawUrl) {
    if (!rawUrl)
        return "";
    try {
        const u = new URL(rawUrl);
        return u.pathname
            .replace(/[-_./]/g, " ")
            .replace(/\.(html|php|aspx|htm)$/i, "")
            .trim();
    }
    catch {
        return rawUrl.replace(/[-_./]/g, " ").trim();
    }
}
function scoreKeywordInFields(kw, fields) {
    let totalScore = 0;
    for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.textLower.includes(kw.kwLower)) {
            totalScore += f.weight * 1.5;
        }
        else if (f.textNoTone.includes(kw.kwNoTone)) {
            totalScore += f.weight * 1.0;
        }
    }
    return totalScore;
}
function extractLocation(fields) {
    let bestLoc = undefined;
    let bestScore = 0;
    for (const loc of PREPARED_LOCATIONS) {
        let locScore = 0;
        for (const alias of loc.aliases) {
            const matchScore = scoreKeywordInFields(alias, fields);
            if (matchScore > locScore) {
                locScore = matchScore;
            }
        }
        if (locScore > bestScore && locScore >= 2.0) {
            bestScore = locScore;
            bestLoc = loc.name;
        }
    }
    return bestLoc;
}
function extractContext(fields) {
    let bestContext = undefined;
    let bestScore = 0;
    for (const ctx of PREPARED_CONTEXTS) {
        let ctxScore = 0;
        for (const kw of ctx.keywords) {
            const matchScore = scoreKeywordInFields(kw, fields);
            if (matchScore > ctxScore) {
                ctxScore = matchScore;
            }
        }
        if (ctxScore > bestScore && ctxScore >= 2.5) {
            bestScore = ctxScore;
            bestContext = ctx.name;
        }
    }
    return bestContext;
}
