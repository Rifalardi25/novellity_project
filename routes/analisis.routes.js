const express = require('express');
const { analisisRateLimiter } = require('../middlewares/rateLimit');
const { concurrencyLimiter } = require('../middlewares/concurrencyLimit');
const { handleMulterUpload, validatePdfFiles } = require('../middlewares/uploadPdf');
const { analyzeJournals, getStatus } = require('../controllers/analisis.controller');

const router = express.Router();

router.get('/status', getStatus);

router.post(
  '/analisis',
  analisisRateLimiter,
  concurrencyLimiter,
  handleMulterUpload,
  validatePdfFiles,
  analyzeJournals
);

module.exports = router;