const axios = require("axios");
const https = require("https");
const http = require("http");
const { discoverSitemapUrls } = require("../dist/crawler/sitemap.js");

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

const client = axios.create({
  httpsAgent,
  httpAgent,
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
});

async function run() {
  const url = "https://homecaresausinh.com";
  console.log("Fetching sitemaps...");
  const urls = await discoverSitemapUrls(url, 200);
  console.log(`Discovered ${urls.length} URLs. Now testing parallel fetch of 50 URLs...`);

  const t0 = Date.now();
  let done = 0;
  const targetUrls = urls.slice(0, 50);

  // Concurrency 15
  const concurrency = 15;
  let index = 0;

  async function worker() {
    while (index < targetUrls.length) {
      const u = targetUrls[index++];
      try {
        await client.get(u);
        done++;
        process.stdout.write(`\rCrawled ${done}/${targetUrls.length} pages...`);
      } catch (err) {
        done++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalSec = (Date.now() - t0) / 1000;
  console.log(`\nDONE: 50 pages crawled in ${totalSec.toFixed(2)}s (${(50 / totalSec).toFixed(1)} pages/sec)!`);
}

run();
