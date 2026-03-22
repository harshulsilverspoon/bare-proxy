import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Simple proxy endpoint
app.use('/proxy', createProxyMiddleware({
  target: '',
  changeOrigin: true,
  router: (req) => {
    const url = req.query.url || req.headers['x-bare-url'];
    return url;
  },
  pathRewrite: (path, req) => {
    const url = new URL(req.query.url || req.headers['x-bare-url']);
    return url.pathname + url.search;
  },
  onProxyReq: (proxyReq, req) => {
    // Forward original headers
    Object.keys(req.headers).forEach(key => {
      if (!key.startsWith('x-bare-')) {
        proxyReq.setHeader(key, req.headers[key]);
      }
    });
  }
}));

app.get('/', (req, res) => {
  res.send('Bare proxy server running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});