const axios = require('axios');
const FormData = require('form-data');

async function uploadTo0x0(buffer, filename = 'image.webp') {
  if (!buffer || buffer.length === 0) {
    throw new Error('0x0: empty buffer');
  }
  const safeName = String(filename || 'upload.bin')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 100);

  const form = new FormData();
  form.append('file', buffer, { filename: safeName, contentType: 'application/octet-stream' });

  const contentLength = await new Promise((resolve, reject) =>
    form.getLength((err, len) => (err ? reject(err) : resolve(len)))
  );

  const r = await axios.post('https://0x0.st', form, {
    headers: { 
      ...form.getHeaders(), 
      'Content-Length': contentLength,
      'User-Agent': 'Omni-AI-Server/1.0',
      'Accept': '*/*',
      'Connection': 'close'
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000,
    validateStatus: () => true
  });
  if (r.status !== 200) {
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || {});
    throw new Error(`0x0 HTTP ${r.status}: ${body.slice(0,200)}`);
  }
  const link = String(r.data || '').trim();
  if (!/^https?:\/\/\S+/.test(link)) throw new Error(`0x0 unexpected: ${link.slice(0,200)}`);
  return link;
}

module.exports = { uploadTo0x0 };


