const { sendError } = require('../utils/response');

const RATE_LIMIT_PER_MIN = parseInt(process.env.RATE_LIMIT_PER_MIN, 10) || 10;
const WINDOW_MS = 60 * 1000;
const requestLogs = new Map();

function rateLimit(req, res, next) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const timestamps = requestLogs.get(clientIp) || [];
  const validTimestamps = timestamps.filter((time) => now - time < WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_PER_MIN) {
    requestLogs.set(clientIp, validTimestamps);
    return sendError(
      res,
      429,
      'TERLALU_BANYAK_PERMINTAAN',
      `Batas maksimal ${RATE_LIMIT_PER_MIN} permintaan per menit telah tercapai. Silakan tunggu sebentar sebelum mencoba lagi.`
    );
  }

  validTimestamps.push(now);
  requestLogs.set(clientIp, validTimestamps);

  return next();
}

rateLimit.rateLimit = rateLimit;
rateLimit.analisisRateLimiter = rateLimit;
module.exports = rateLimit;