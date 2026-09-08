"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSiteStructure = buildSiteStructure;
function buildSiteStructure(pages, rootUrl) {
    let rootDomain = "";
    try {
        rootDomain = new URL(rootUrl).hostname;
    }
    catch {
        rootDomain = "localhost";
    }
    const rootNode = {
        path: "/",
        segment: "Homepage",
        url: rootUrl,
        title: pages[rootUrl]?.title || "Homepage",
        depth: 0,
        pageCount: 0,
        children: {}
    };
    const depthDistribution = {};
    const orphanPages = [];
    const topLinkedPages = [];
    for (const page of Object.values(pages)) {
        // Depth distribution
        depthDistribution[page.depth] = (depthDistribution[page.depth] || 0) + 1;
        // Orphan pages check (excluding homepage)
        if (page.depth > 0 && page.inlinks.length === 0) {
            orphanPages.push({
                url: page.url,
                title: page.title || "(No Title)",
                depth: page.depth
            });
        }
        // Top linked pages
        topLinkedPages.push({
            url: page.url,
            title: page.title || "(No Title)",
            inlinkCount: page.inlinks.length
        });
        // Build URL tree
        try {
            const u = new URL(page.url);
            const segments = u.pathname.split("/").filter(Boolean);
            let currentNode = rootNode;
            currentNode.pageCount++;
            let currentPath = "";
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                currentPath += "/" + seg;
                if (!currentNode.children[seg]) {
                    currentNode.children[seg] = {
                        path: currentPath,
                        segment: seg,
                        depth: i + 1,
                        pageCount: 0,
                        children: {}
                    };
                }
                currentNode = currentNode.children[seg];
                currentNode.pageCount++;
                // If this is leaf segment and matches page URL
                if (i === segments.length - 1) {
                    currentNode.url = page.url;
                    currentNode.title = page.title;
                }
            }
        }
        catch {
            // Ignore invalid URL
        }
    }
    // Sort top linked
    topLinkedPages.sort((a, b) => b.inlinkCount - a.inlinkCount);
    // Sections summary (direct children of homepage)
    const sectionsSummary = Object.entries(rootNode.children).map(([seg, node]) => ({
        section: `/${seg}`,
        pageCount: node.pageCount
    })).sort((a, b) => b.pageCount - a.pageCount);
    // Render ASCII tree
    const asciiTree = renderAsciiTree(rootNode);
    return {
        tree: rootNode,
        asciiTree,
        depthDistribution,
        orphanPages,
        topLinkedPages: topLinkedPages.slice(0, 15),
        sectionsSummary
    };
}
function renderAsciiTree(node, prefix = "", isLast = true) {
    let result = "";
    const displayName = node.depth === 0 ? "Homepage (" + (node.title || node.path) + ")" : `${node.segment} [${node.pageCount} pages]`;
    if (node.depth === 0) {
        result += displayName + "\n";
    }
    else {
        result += prefix + (isLast ? "└── " : "├── ") + displayName + "\n";
    }
    const childEntries = Object.entries(node.children);
    const nextPrefix = node.depth === 0 ? "" : prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < childEntries.length; i++) {
        const [, childNode] = childEntries[i];
        const isChildLast = i === childEntries.length - 1;
        result += renderAsciiTree(childNode, nextPrefix, isChildLast);
    }
    return result;
}
