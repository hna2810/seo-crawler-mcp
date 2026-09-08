"use strict";
/**
 * Vietnamese text processing and NLP utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeVietnameseTones = removeVietnameseTones;
exports.cleanText = cleanText;
exports.countWords = countWords;
exports.tokenize = tokenize;
exports.getNgrams = getNgrams;
exports.calculateJaccardSimilarity = calculateJaccardSimilarity;
function removeVietnameseTones(str) {
    if (!str)
        return "";
    let s = str;
    s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
    s = s.replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, "A");
    s = s.replace(/[èéẹẻẽêềếệểễ]/g, "e");
    s = s.replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, "E");
    s = s.replace(/[ìíịỉĩ]/g, "i");
    s = s.replace(/[ÌÍỊỈĨ]/g, "I");
    s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
    s = s.replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, "O");
    s = s.replace(/[ùúụủũưừứựửữ]/g, "u");
    s = s.replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, "U");
    s = s.replace(/[ỳýỵỷỹ]/g, "y");
    s = s.replace(/[ỲÝỴỶỸ]/g, "Y");
    s = s.replace(/đ/g, "d");
    s = s.replace(/Đ/g, "D");
    // Combining marks
    s = s.replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "");
    s = s.replace(/[\u02C6\u0306\u031B]/g, "");
    return s;
}
function cleanText(str) {
    if (!str)
        return "";
    return str.replace(/\s+/g, " ").trim();
}
function countWords(text) {
    if (!text)
        return 0;
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    return words.length;
}
function tokenize(text) {
    if (!text)
        return [];
    const clean = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
    return clean.split(/\s+/).filter(t => t.length > 0);
}
function getNgrams(tokens, n) {
    if (tokens.length < n)
        return [];
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(" "));
    }
    return ngrams;
}
/**
 * Jaccard Similarity between two sets of n-grams (default 3-grams) for duplicate content check
 */
function calculateJaccardSimilarity(textA, textB, nGramSize = 3) {
    const tokensA = tokenize(textA);
    const tokensB = tokenize(textB);
    if (tokensA.length === 0 || tokensB.length === 0)
        return 0;
    const ngramsA = new Set(getNgrams(tokensA, nGramSize));
    const ngramsB = new Set(getNgrams(tokensB, nGramSize));
    if (ngramsA.size === 0 || ngramsB.size === 0) {
        // Fallback to word-level overlap
        const setA = new Set(tokensA);
        const setB = new Set(tokensB);
        let intersection = 0;
        for (const w of setA) {
            if (setB.has(w))
                intersection++;
        }
        const union = new Set([...tokensA, ...tokensB]).size;
        return union === 0 ? 0 : intersection / union;
    }
    let intersection = 0;
    for (const gram of ngramsA) {
        if (ngramsB.has(gram)) {
            intersection++;
        }
    }
    const union = new Set([...ngramsA, ...ngramsB]).size;
    return union === 0 ? 0 : intersection / union;
}
