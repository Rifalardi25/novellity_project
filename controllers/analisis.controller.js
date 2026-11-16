const fs = require('fs');
const path = require('path');
const { analyzePdfDocuments } = require('../services/gemini.service');
const { clearFileBuffers } = require('../middlewares/uploadPdf');
const { getQueueStatus } = require('../middlewares/concurrencyLimit');
const { sendSuccess, sendError } = require('../utils/response');

const SAMPLES_DIR = path.join(__dirname, '..', 'public', 'samples');

async function loadSamplePdfFiles() {
  if (!fs.existsSync(SAMPLES_DIR)) {
    return [];
  }

  const entries = await fs.promises.readdir(SAMPLES_DIR);
  const pdfNames = entries
    .filter((name) => path.extname(name).toLowerCase() === '.pdf')
    .sort()
    .slice(0, 3);

  const sampleFiles = [];

  for (const fileName of pdfNames) {
    const filePath = path.join(SAMPLES_DIR, fileName);
    const buffer = await fs.promises.readFile(filePath);

    if (buffer.length > 0 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      sampleFiles.push({
        originalname: fileName,
        buffer,
        size: buffer.length,
      });
    }
  }

  return sampleFiles;
}

function getStatus(req, res) {
  const queueStatus = getQueueStatus();
  return res.status(200).json({
    success: true,
    status: 'aktif',
    ...queueStatus,
  });
}

async function analyzeJournals(req, res) {
  const startTime = Date.now();
  const isSampleMode =
    req.body && (req.body.useSample === 'true' || req.body.useSample === true);

  let filesToProcess = [];

  try {
    if (isSampleMode) {
      filesToProcess = await loadSamplePdfFiles();

      if (filesToProcess.length === 0) {
        return sendError(
          res,
          400,
          'BERKAS_TIDAK_VALID',
          'Paket jurnal contoh belum tersedia di folder public/samples peladen.'
        );
      }
    } else {
      filesToProcess = req.files || [];
    }

    const hasilAnalisis = await analyzePdfDocuments(filesToProcess);
    const durasiMs = Date.now() - startTime;

    console.log(
      `[ANALISIS_SUKSES] mode=${isSampleMode ? 'sample' : 'upload'} jumlah_file=${filesToProcess.length} durasi_ms=${durasiMs}`
    );

    return sendSuccess(res, hasilAnalisis, {
      jumlah_file: filesToProcess.length,
      durasi_ms: durasiMs,
    });
  } catch (err) {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[ANALISIS_GAGAL] code=${err.code || 'KESALAHAN_SERVER'} durasi_ms=${durasiMs}`
    );

    return sendError(
      res,
      err.statusCode || 500,
      err.code || 'KESALAHAN_SERVER',
      err.message || 'Terjadi kesalahan internal saat memproses analisis jurnal.'
    );
  } finally {
    clearFileBuffers(filesToProcess);
    if (req.files) {
      clearFileBuffers(req.files);
    }
  }
}

module.exports = {
  getStatus,
  analyzeJournals,
};