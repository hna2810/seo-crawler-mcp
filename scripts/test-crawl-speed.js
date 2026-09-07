const axios = require("axios");
const { discoverSitemapUrls, fetchSitemapUrls } = require("../dist/crawler/sitemap.js");

async function main() {
  const url = "https://homecaresausinh.com";
  console.log("Checking sitemap for:", url);
  const t0 = Date.now();
  const sitemapUrls = await discoverSitemapUrls(url, 2000);
  console.log(`Discovered ${sitemapUrls.length} sitemap URLs in ${Date.now() - t0}ms`);
  if (sitemapUrls.length > 0) {
    console.log("Sample sitemap URLs:", sitemapUrls.slice(0, 5));
  }

  console.log("\nTesting single page fetch...");
  const t1 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 10000
    });
    console.log(`Homepage fetched: ${res.status} in ${Date.now() - t1}ms, length: ${res.data.length}`);
  } catch (err) {
    console.error("Homepage error:", err.message);
  }
}

main();
