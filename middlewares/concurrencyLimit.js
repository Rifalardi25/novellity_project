const { sendError } = require('../utils/response');

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT, 10) || 5;
let activeRequests = 0;

function getQueueStatus() {
  return {
    active: activeRequests,
    max: MAX_CONCURRENT,
    available: Math.max(0, MAX_CONCURRENT - activeRequests),
    antrean_aktif: activeRequests,
    maks_antrean: MAX_CONCURRENT,
  };
}

function concurrencyLimit(req, res, next) {
  if (activeRequests >= MAX_CONCURRENT) {
    return sendError(
      res,
      503,
      'SERVER_SEDANG_SIBUK',
      `Peladen sedang memproses ${MAX_CONCURRENT} analisis secara bersamaan. Silakan tunggu beberapa detik lalu coba kembali.`
    );
  }

  activeRequests += 1;
  let isReleased = false;

  const releaseSlot = () => {
    if (!isReleased) {
      isReleased = true;
      activeRequests = Math.max(0, activeRequests - 1);
    }
  };

  res.on('finish', releaseSlot);
  res.on('close', releaseSlot);

  return next();
}

concurrencyLimit.concurrencyLimit = concurrencyLimit;
concurrencyLimit.concurrencyLimiter = concurrencyLimit;
concurrencyLimit.getQueueStatus = getQueueStatus;
concurrencyLimit.getConcurrencyStatus = getQueueStatus;
concurrencyLimit.getActiveRequests = () => activeRequests;
concurrencyLimit.MAX_CONCURRENT = MAX_CONCURRENT;

module.exports = concurrencyLimit;