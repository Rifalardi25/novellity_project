const path = require('path');
const multer = require('multer');
const { sendError } = require('../utils/response');

const MAX_FILES = parseInt(process.env.MAX_FILES, 10) || 10;
const MAX_TOTAL_MB = parseInt(process.env.MAX_TOTAL_MB, 10) || 15;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_TOTAL_BYTES,
  },
});

function clearFileBuffers(files) {
  if (Array.isArray(files)) {
    for (const file of files) {
      file.buffer = null;
    }
  }
}

function handleMulterUpload(req, res, next) {
  const uploader = upload.array('files', MAX_FILES);

  uploader(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT') {
        return sendError(
          res,
          400,
          'BERKAS_TIDAK_VALID',
          `Jumlah berkas melebihi batas maksimal ${MAX_FILES} file PDF.`
        );
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(
          res,
          413,
          'UKURAN_MELEBIHI_BATAS',
          `Ukuran berkas melampaui batas maksimal ${MAX_TOTAL_MB} MB.`
        );
      }

      return sendError(
        res,
        400,
        'BERKAS_TIDAK_VALID',
        `Gagal memproses unggahan berkas: ${err.message}`
      );
    }

    return sendError(
      res,
      400,
      'BERKAS_TIDAK_VALID',
      'Terjadi kesalahan saat membaca berkas unggahan.'
    );
  });
}

function validatePdfFiles(req, res, next) {
  const isSampleMode =
    req.body && (req.body.useSample === 'true' || req.body.useSample === true);

  if (isSampleMode) {
    return next();
  }

  const files = req.files;

  if (!files || files.length === 0) {
    return sendError(
      res,
      400,
      'BERKAS_TIDAK_VALID',
      'Minimal satu berkas PDF harus diunggah sebelum memulai analisis.'
    );
  }

  if (files.length > MAX_FILES) {
    clearFileBuffers(files);
    return sendError(
      res,
      400,
      'BERKAS_TIDAK_VALID',
      `Maksimal hanya ${MAX_FILES} berkas PDF yang diperbolehkan.`
    );
  }

  let totalBytes = 0;

  for (const file of files) {
    if (!file.buffer || file.size === 0) {
      clearFileBuffers(files);
      return sendError(
        res,
        400,
        'BERKAS_TIDAK_VALID',
        `Berkas "${file.originalname}" kosong (0 byte) dan tidak dapat diproses.`
      );
    }

    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      clearFileBuffers(files);
      return sendError(
        res,
        413,
        'UKURAN_MELEBIHI_BATAS',
        `Akumulasi ukuran seluruh berkas melampaui batas maksimal ${MAX_TOTAL_MB} MB.`
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = ext === '.pdf';

    if (!isPdfMime || !isPdfExt) {
      clearFileBuffers(files);
      return sendError(
        res,
        415,
        'BUKAN_FORMAT_PDF',
        `Berkas "${file.originalname}" ditolak karena bukan berformat PDF.`
      );
    }

    const pdfSignature = file.buffer.subarray(0, 5).toString('ascii');
    if (pdfSignature !== '%PDF-') {
      clearFileBuffers(files);
      return sendError(
        res,
        415,
        'BUKAN_FORMAT_PDF',
        `Isi berkas "${file.originalname}" tidak valid sebagai dokumen PDF asli.`
      );
    }
  }

  return next();
}

module.exports = {
  handleMulterUpload,
  validatePdfFiles,
  clearFileBuffers,
};