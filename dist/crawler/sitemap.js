"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRobotsTxt = fetchRobotsTxt;
exports.fetchSitemapUrls = fetchSitemapUrls;
exports.discoverSitemapUrls = discoverSitemapUrls;
const axios_1 = __importDefault(require("axios"));
const fast_xml_parser_1 = require("fast-xml-parser");
async function fetchRobotsTxt(baseUrl, userAgent = "*") {
    const result = {
        disallowedPaths: [],
        sitemapUrls: []
    };
    try {
        const parsedBase = new URL(baseUrl);
        const robotsUrl = `${parsedBase.protocol}//${parsedBase.host}/robots.txt`;
        const res = await axios_1.default.get(robotsUrl, {
            timeout: 8000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
            validateStatus: () => true
        });
        if (res.status !== 200 || typeof res.data !== "string") {
            return result;
        }
        const lines = res.data.split(/\r?\n/);
        let currentUserAgent = "";
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#"))
                continue;
            const [directive, ...rest] = line.split(":");
            const key = directive.trim().toLowerCase();
            const val = rest.join(":").trim();
            if (key === "user-agent") {
                currentUserAgent = val.toLowerCase();
            }
            else if (key === "disallow") {
                if (currentUserAgent === "*" || currentUserAgent === userAgent.toLowerCase()) {
                    if (val) {
                        result.disallowedPaths.push(val);
                    }
                }
            }
            else if (key === "sitemap") {
                if (val) {
                    result.sitemapUrls.push(val);
                }
            }
        }
    }
    catch (err) {
        // Ignore robots.txt errors
    }
    return result;
}
async function fetchSitemapUrls(sitemapUrl, maxUrls = 500, visitedSitemaps = new Set()) {
    const collectedUrls = [];
    if (visitedSitemaps.has(sitemapUrl) || visitedSitemaps.size > 20) {
        return collectedUrls;
    }
    visitedSitemaps.add(sitemapUrl);
    try {
        const res = await axios_1.default.get(sitemapUrl, {
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
            responseType: "text"
        });
        if (res.status !== 200 || !res.data) {
            return collectedUrls;
        }
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const parsed = parser.parse(res.data);
        // Case 1: Sitemap Index (<sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>)
        if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
            const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
                ? parsed.sitemapindex.sitemap
                : [parsed.sitemapindex.sitemap];
            for (const sm of sitemaps) {
                if (collectedUrls.length >= maxUrls)
                    break;
                const subLoc = typeof sm.loc === "string" ? sm.loc.trim() : "";
                if (subLoc) {
                    const subUrls = await fetchSitemapUrls(subLoc, maxUrls - collectedUrls.length, visitedSitemaps);
                    collectedUrls.push(...subUrls);
                }
            }
        }
        // Case 2: Urlset (<urlset><url><loc>...</loc></url></urlset>)
        if (parsed.urlset && parsed.urlset.url) {
            const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
            for (const u of urls) {
                if (collectedUrls.length >= maxUrls)
                    break;
                const loc = typeof u.loc === "string" ? u.loc.trim() : "";
                if (loc && !collectedUrls.includes(loc)) {
                    collectedUrls.push(loc);
                }
            }
        }
    }
    catch (err) {
        // Sitemap fetch error ignored
    }
    return collectedUrls;
}
async function discoverSitemapUrls(baseUrl, maxUrls = 500) {
    const robots = await fetchRobotsTxt(baseUrl);
    const potentialSitemaps = [...robots.sitemapUrls];
    const parsedBase = new URL(baseUrl);
    const hostBase = `${parsedBase.protocol}//${parsedBase.host}`;
    const standardCandidates = [
        `${hostBase}/sitemap.xml`,
        `${hostBase}/sitemap_index.xml`,
        `${hostBase}/wp-sitemap.xml`,
        `${hostBase}/sitemap-posts.xml`
    ];
    for (const c of standardCandidates) {
        if (!potentialSitemaps.includes(c)) {
            potentialSitemaps.push(c);
        }
    }
    for (const sitemapUrl of potentialSitemaps) {
        const urls = await fetchSitemapUrls(sitemapUrl, maxUrls);
        if (urls.length > 0) {
            return urls;
        }
    }
    return [];
}
