require('dotenv').config();

const path = require('path');
const express = require('express');
const pageRoutes = require('./routes/page.routes');
const analisisRoutes = require('./routes/analisis.routes');
const { sendError } = require('./utils/response');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use('/', pageRoutes);
app.use('/api', analisisRoutes);

app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return sendError(
      res,
      404,
      'ENDPOINT_TIDAK_DITEMUKAN',
      `Endpoint ${req.method} ${req.originalUrl} tidak tersedia.`
    );
  }

  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><title>404 - Halaman Tidak Ditemukan</title></head>
    <body style="font-family: sans-serif; text-align: center; padding: 4rem;">
      <h1>404 - Halaman Tidak Ditemukan</h1>
      <p>Halaman yang Anda cari tidak tersedia di peladen Novellity.</p>
      <a href="/">Kembali ke Beranda</a>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err.message);
  return sendError(
    res,
    err.statusCode || 500,
    err.code || 'KESALAHAN_SERVER',
    'Terjadi kesalahan internal pada peladen. Silakan coba kembali beberapa saat lagi.'
  );
});

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Novellity berjalan di http://localhost:${PORT}`);
});

server.setTimeout(190000);