import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import querystring from 'querystring';

const whatsappDevPlugin = () => ({
  name: 'whatsapp-dev-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/send-whatsapp') && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const { serverUrl, apiToken, instanceId, phone, message } = data;

            let targetUrl = (serverUrl || 'https://wa.yello.bid').trim().replace(/\/$/, '');
            if (targetUrl.includes('transmaxsolutons.com')) {
              targetUrl = targetUrl.replace('transmaxsolutons.com', 'transmaxsolutions.com');
            }
            if (!targetUrl || targetUrl === 'https://wa.transmaxsolutons.com') {
              targetUrl = 'https://wa.yello.bid';
            }

            const secretKey = (apiToken || '').trim() || 'bef0066b8598f3c97dc16e7af12e95b98e773430';
            const accountId = (instanceId || '').trim() || '1765976556c4ca4238a0b923820dcc509a6f75849b6942a9ec027d2';

            let cleanPhone = (phone || '').replace(/[^\d+]/g, '');
            if (cleanPhone.startsWith('03')) cleanPhone = '+92' + cleanPhone.slice(1);
            if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

            const postData = querystring.stringify({
              secret: secretKey,
              account: accountId,
              recipient: cleanPhone,
              message: message || 'Greetings from Globetrek PK!',
              type: 'text'
            });

            const targetHost = targetUrl.replace(/^https?:\/\//, '');
            const options = {
              hostname: targetHost,
              path: '/api/send/whatsapp',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
              }
            };

            const result = await new Promise((resolve) => {
              const waReq = https.request(options, (waRes) => {
                let waData = '';
                waRes.on('data', c => waData += c);
                waRes.on('end', () => {
                  try {
                    const parsed = JSON.parse(waData);
                    if (parsed.status === 200) {
                      resolve({ success: true, data: parsed });
                    } else {
                      resolve({ success: false, error: parsed.message || 'WhatsApp Gateway Error' });
                    }
                  } catch(e) {
                    resolve({ success: false, error: waData });
                  }
                });
              });

              waReq.on('error', (err) => {
                resolve({ success: false, error: err.message });
              });

              waReq.write(postData);
              waReq.end();
            }) as any;

            res.setHeader('Content-Type', 'application/json');
            if (result.success) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, response: result.data }));
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: result.error || 'Gateway dispatch failed' }));
            }

          } catch(err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), whatsappDevPlugin()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://leads-globetrek.pages.dev',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
