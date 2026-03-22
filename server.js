import express from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*'
}));

function proxyRequest(targetUrl, res) {
    try {
        const url = new URL(targetUrl);
        const client = url.protocol === 'https:' ? https : http;

        const proxyReq = client.request(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Host': url.host,
            }
        }, (proxyRes) => {
            // Handle redirects ourselves instead of letting browser follow
            if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
                const location = proxyRes.headers['location'];
                if (location) {
                    // Convert relative redirects to absolute
                    const redirectUrl = new URL(location, targetUrl).href;
                    // Proxy the redirect destination instead
                    return proxyRequest(redirectUrl, res);
                }
            }

            res.status(proxyRes.statusCode);

            Object.keys(proxyRes.headers).forEach(key => {
                const skip = ['x-frame-options', 'content-security-policy', 
                              'content-length', 'transfer-encoding', 
                              'location', 'set-cookie'];
                if (!skip.includes(key.toLowerCase())) {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });

            // Rewrite HTML to proxy links
            const contentType = proxyRes.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                let body = '';
                proxyRes.on('data', chunk => body += chunk);
                proxyRes.on('end', () => {
                    // Inject base tag so relative links work
                    const base = `<base href="${targetUrl}">`;
                    body = body.replace(/<head([^>]*)>/i, `<head$1>${base}`);
                    res.send(body);
                });
            } else {
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            res.status(500).send('Proxy error: ' + err.message);
        });

        proxyReq.end();
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
}

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing ?url= parameter');
    }
    proxyRequest(targetUrl, res);
});

app.get('/', (req, res) => {
    res.send('Proxy server running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});