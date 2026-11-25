const multer = require('multer');
const { sendError } = require('../utils/response');

const MAX_FILES = parseInt(process.env.MAX_FILES, 10) || 10;
const MAX_TOTAL_MB = parseInt(process.env.MAX_TOTAL_MB, 10) || 15;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: MAX_FILES,
    fileSize: MAX_TOTAL_BYTES,
  },
});

function handleMulterUpload(req, res, next) {
  const uploadHandler = upload.array('files', MAX_FILES);

  uploadHandler(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return sendError(
          res,
          400,
          'BERKAS_TIDAK_VALID',
          `Jumlah berkas melebihi batas maksimal ${MAX_FILES} dokumen PDF.`
        );
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(
          res,
          413,
          'UKURAN_MELEBIHI_BATAS',
          `Ukuran berkas melebihi batas maksimal total ${MAX_TOTAL_MB} MB.`
        );
      }

      return sendError(res, 400, 'BERKAS_TIDAK_VALID', `Gagal memproses unggahan: ${err.message}`);
    }

    return next(err);
  });
}

function validatePdfFiles(req, res, next) {
  if (req.body && req.body.useSample === 'true') {
    return next();
  }

  const files = req.files || [];

  if (files.length === 0) {
    return sendError(
      res,
      400,
      'BERKAS_TIDAK_VALID',
      'Silakan unggah minimal 1 berkas jurnal ilmiah berformat PDF.'
    );
  }

  if (files.length > MAX_FILES) {
    clearFileBuffers(files);
    req.files = [];
    return sendError(
      res,
      400,
      'BERKAS_TIDAK_VALID',
      `Maksimal hanya ${MAX_FILES} dokumen PDF yang dapat dianalisis dalam satu sesi.`
    );
  }

  let totalBytes = 0;

  for (const file of files) {
    if (!file.buffer || file.size === 0) {
      clearFileBuffers(files);
      req.files = [];
      return sendError(
        res,
        400,
        'BERKAS_TIDAK_VALID',
        `Berkas "${file.originalname}" kosong (0 byte) dan tidak dapat diproses.`
      );
    }

    const headerSignature = file.buffer.subarray(0, 5).toString('ascii');
    if (headerSignature !== '%PDF-') {
      clearFileBuffers(files);
      req.files = [];
      return sendError(
        res,
        415,
        'BUKAN_FORMAT_PDF',
        `Isi berkas "${file.originalname}" tidak valid sebagai dokumen PDF asli.`
      );
    }

    totalBytes += file.size;
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    clearFileBuffers(files);
    req.files = [];
    return sendError(
      res,
      413,
      'UKURAN_MELEBIHI_BATAS',
      `Total ukuran seluruh berkas melebihi batas maksimal ${MAX_TOTAL_MB} MB.`
    );
  }

  return next();
}

function clearFileBuffers(files) {
  if (!Array.isArray(files)) {
    return;
  }

  for (const file of files) {
    if (file && file.buffer) {
      file.buffer = null;
    }
  }

  files.length = 0;
}

module.exports = {
  uploadPdf: handleMulterUpload,
  handleMulterUpload,
  validatePdfFiles,
  clearFileBuffers,
};