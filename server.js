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

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('Missing ?url= parameter');
    }

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
            // Forward status code
            res.status(proxyRes.statusCode);
            
            // Forward headers (except ones that break iframes)
            Object.keys(proxyRes.headers).forEach(key => {
                if (!['x-frame-options', 'content-security-policy', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });

            // Pipe the response
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            res.status(500).send('Proxy error: ' + err.message);
        });

        proxyReq.end();
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.get('/', (req, res) => {
    res.send('Proxy server running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});