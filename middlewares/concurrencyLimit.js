const { sendError } = require('../utils/response');

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT, 10) || 5;
let activeRequests = 0;

function concurrencyLimiter(req, res, next) {
  if (activeRequests >= MAX_CONCURRENT) {
    return sendError(
      res,
      503,
      'SERVER_SEDANG_SIBUK',
      'Server sedang memproses permintaan analisis lain. Silakan tunggu beberapa detik lalu coba kembali.'
    );
  }

  activeRequests += 1;
  let released = false;

  const releaseSlot = () => {
    if (!released) {
      released = true;
      activeRequests = Math.max(0, activeRequests - 1);
    }
  };

  res.on('finish', releaseSlot);
  res.on('close', releaseSlot);

  return next();
}

function getQueueStatus() {
  return {
    antrean_aktif: activeRequests,
    maks_antrean: MAX_CONCURRENT,
  };
}

module.exports = {
  concurrencyLimiter,
  getQueueStatus,
};