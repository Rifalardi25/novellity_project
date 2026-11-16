const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

const maxRequestsPerMin = parseInt(process.env.RATE_LIMIT_PER_MIN, 10) || 5;

const analisisRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: maxRequestsPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TERLALU_BANYAK_PERMINTAAN',
      `Batas maksimal ${maxRequestsPerMin} permintaan analisis per menit tercapai. Silakan tunggu satu menit sebelum mencoba lagi.`
    );
  },
});

module.exports = {
  analisisRateLimiter,
};