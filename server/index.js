import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * POST /api/check-website
 * Real server-side HTTP health check — returns actual HTTP status codes.
 * No CORS restrictions, no opaque responses, real verification.
 */
app.post('/api/check-website', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.json({ url: '', status: 'No Website', httpCode: 0, error: 'No URL provided' });
  }

  const lowerUrl = url.toLowerCase().trim();

  // Classify social media pages directly (no HTTP check needed)
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com') || lowerUrl.includes('fb.me')) {
    return res.json({ url, status: 'Facebook Page Only', httpCode: 200, social: true });
  }
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return res.json({ url, status: 'Instagram Bio Only', httpCode: 200, social: true });
  }
  if (lowerUrl.includes('tiktok.com')) {
    return res.json({ url, status: 'TikTok Profile Only', httpCode: 200, social: true });
  }

  // Ensure URL has protocol
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    const httpCode = response.status;
    let status;

    if (httpCode >= 200 && httpCode < 300) {
      status = 'Active (200 OK)';
    } else if (httpCode >= 300 && httpCode < 400) {
      status = 'Redirect (' + httpCode + ')';
    } else if (httpCode === 403) {
      status = 'Forbidden (403)';
    } else if (httpCode === 404) {
      status = 'Broken (404 Error)';
    } else if (httpCode >= 500) {
      status = 'Server Error (' + httpCode + ')';
    } else {
      status = 'HTTP ' + httpCode;
    }

    return res.json({
      url: response.url || targetUrl,
      status,
      httpCode,
      finalUrl: response.url,
      redirected: response.redirected
    });

  } catch (error) {
    const errMsg = error.message || 'Unknown error';
    let status = 'Broken (404 Error)';

    if (errMsg.includes('abort') || errMsg.includes('timeout')) {
      status = 'Timeout (8s)';
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      status = 'Domain Not Found';
    } else if (errMsg.includes('ECONNREFUSED')) {
      status = 'Connection Refused';
    } else if (errMsg.includes('certificate') || errMsg.includes('SSL') || errMsg.includes('CERT')) {
      status = 'SSL Error';
    }

    return res.json({
      url: targetUrl,
      status,
      httpCode: 0,
      error: errMsg
    });
  }
});

/**
 * POST /api/bulk-check-websites
 * Batch health check — checks multiple URLs in parallel.
 */
app.post('/api/bulk-check-websites', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.json({ results: [] });
  }

  // Limit to 50 URLs per batch
  const batch = urls.slice(0, 50);

  const results = await Promise.all(
    batch.map(async (url) => {
      try {
        const checkRes = await fetch(`http://localhost:${PORT}/api/check-website`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        return await checkRes.json();
      } catch {
        return { url, status: 'Check Failed', httpCode: 0 };
      }
    })
  );

  return res.json({ results });
});

/**
 * GET /api/health
 * Backend health check endpoint.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'pk-lead-scraper-backend', port: PORT, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 PK Lead Scraper Backend running on http://localhost:${PORT}`);
  console.log(`   POST /api/check-website      — Real HTTP health check`);
  console.log(`   POST /api/bulk-check-websites — Batch health check`);
  console.log(`   GET  /api/health              — Server health\n`);
});
