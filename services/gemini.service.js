const pdfParseLib = require('pdf-parse');
const { ai, GEMINI_MODEL, AI_TIMEOUT_MS } = require('../config/gemini');
const { analisisResponseSchema, validateAnalisisPayload } = require('../utils/schema');
const { SYSTEM_INSTRUCTION, buildUserPrompt } = require('./prompt.service');

const MAX_CHARS_PER_DOC = 10000;
const HEAD_CHARS = 6500;
const TAIL_CHARS = 3500;

const MODEL_CANDIDATES = [
  ...new Set([
    GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-4-hydrogen',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ]),
];

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanAndTrimAcademicText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const halfIndex = Math.floor(cleaned.length * 0.45);
  const tailText = cleaned.slice(halfIndex);
  const refMatch = tailText.search(/\n\s*(references|daftar pustaka|bibliography)\s*\n/i);

  if (refMatch !== -1) {
    cleaned = cleaned.slice(0, halfIndex + refMatch).trim();
  }

  if (cleaned.length > MAX_CHARS_PER_DOC) {
    const headPart = cleaned.slice(0, HEAD_CHARS).trim();
    const tailPart = cleaned.slice(-TAIL_CHARS).trim();
    cleaned = `${headPart}\n\n[...bagian tinjauan tengah diringkas untuk efisiensi...]\n\n${tailPart}`;
  }

  return cleaned;
}

async function extractPdfText(buffer) {
  try {
    if (typeof pdfParseLib === 'function') {
      const parsed = await pdfParseLib(buffer);
      return cleanAndTrimAcademicText(parsed?.text || '');
    }

    if (pdfParseLib && typeof pdfParseLib.PDFParse === 'function') {
      const parser = new pdfParseLib.PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return cleanAndTrimAcademicText(result?.text || '');
    }

    return '';
  } catch (err) {
    console.warn('[PDF_PARSE_FALLBACK]', err.message);
    return '';
  }
}

function isRetryableError(err) {
  const status = Number(err?.status || err?.statusCode || 0);
  const msg = (err?.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 500 ||
    status === 429 ||
    status === 404 ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('429') ||
    msg.includes('404') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('not_found') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('network')
  );
}

async function callModelWithDeadline(modelName, contents, deadlineMs) {
  const remainingMs = deadlineMs - Date.now();
  const timeoutSeconds = Math.round(AI_TIMEOUT_MS / 1000);

  if (remainingMs <= 3000) {
    throw createServiceError(
      504,
      'LAYANAN_AI_TIMEOUT',
      `Waktu pemrosesan AI melebihi batas ${timeoutSeconds} detik. Silakan coba kembali beberapa saat lagi.`
    );
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        createServiceError(
          504,
          'LAYANAN_AI_TIMEOUT',
          `Waktu pemrosesan AI melebihi batas ${timeoutSeconds} detik. Silakan coba kembali beberapa saat lagi.`
        )
      );
    }, remainingMs);
  });

  try {
    const apiCallPromise = ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: analisisResponseSchema,
        temperature: 0.3,
      },
    });

    return await Promise.race([apiCallPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function analyzePdfDocuments(files) {
  const extractedDocs = [];
  const fallbackInlineParts = [];

  for (const file of files) {
    const text = await extractPdfText(file.buffer);

    if (text.length >= 100) {
      console.log(`[PDF_EXTRACT] ${file.originalname} -> ${text.length} karakter teks`);
      extractedDocs.push({
        fileName: file.originalname,
        extractedText: text,
      });
    } else {
      console.warn(`[PDF_EXTRACT] ${file.originalname} -> teks minim, memakai lampiran biner`);
      extractedDocs.push({
        fileName: `${file.originalname} (terlampir sebagai dokumen visual)`,
        extractedText: '',
      });
      fallbackInlineParts.push({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      });
    }
  }

  const userPrompt = buildUserPrompt(extractedDocs);
  const contents = [...fallbackInlineParts, { text: userPrompt }];
  const deadlineMs = Date.now() + AI_TIMEOUT_MS;

  try {
    let response = null;
    let lastError = null;

    for (let i = 0; i < MODEL_CANDIDATES.length; i += 1) {
      if (Date.now() >= deadlineMs - 4000) {
        break;
      }

      const currentModel = MODEL_CANDIDATES[i];
      try {
        response = await callModelWithDeadline(currentModel, contents, deadlineMs);
        console.log(`[GEMINI_SUCCESS] model=${currentModel}`);
        break;
      } catch (err) {
        lastError = err;
        console.error(`[GEMINI_SDK_ERROR] model=${currentModel}`, err.status || '', err.message || err);

        if (err.code === 'LAYANAN_AI_TIMEOUT') {
          throw err;
        }

        const hasNextModel = i < MODEL_CANDIDATES.length - 1;
        if (hasNextModel && isRetryableError(err)) {
          await sleep(1000);
          continue;
        }

        throw err;
      }
    }

    if (!response) {
      throw lastError || createServiceError(502, 'LAYANAN_AI_GAGAL', 'Gagal menerima respons dari model AI.');
    }

    const rawText = typeof response.text === 'function' ? response.text() : response.text;

    if (!rawText) {
      throw createServiceError(
        502,
        'LAYANAN_AI_GAGAL',
        'Model AI tidak mengembalikan data analisis. Silakan ulangi permintaan Anda.'
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      throw createServiceError(
        502,
        'LAYANAN_AI_GAGAL',
        'Format jawaban AI tidak valid dan gagal diproses oleh server.'
      );
    }

    if (!validateAnalisisPayload(parsedData)) {
      throw createServiceError(
        502,
        'LAYANAN_AI_GAGAL',
        'Struktur hasil analisis AI tidak lengkap. Silakan coba jalankan analisis kembali.'
      );
    }

    return parsedData;
  } catch (err) {
    if (err.statusCode && err.code) {
      throw err;
    }

    const rawMessage = (err.message || '').toLowerCase();

    if (
      rawMessage.includes('password') ||
      rawMessage.includes('encrypted') ||
      rawMessage.includes('unable to process') ||
      rawMessage.includes('invalid argument') ||
      rawMessage.includes('document has no pages')
    ) {
      throw createServiceError(
        422,
        'PDF_TIDAK_TERBACA',
        'Salah satu berkas PDF rusak, kosong, atau dilindungi kata sandi sehingga tidak dapat dibaca oleh sistem.'
      );
    }

    if (
      rawMessage.includes('quota') ||
      rawMessage.includes('429') ||
      rawMessage.includes('resource_exhausted')
    ) {
      throw createServiceError(
        502,
        'LAYANAN_AI_GAGAL',
        'Kuota layanan AI gratis sedang penuh sementara. Silakan tunggu satu menit lalu coba lagi.'
      );
    }

    if (isRetryableError(err)) {
      throw createServiceError(
        503,
        'LAYANAN_AI_PADAT',
        'Peladen Google Gemini sedang mengalami lonjakan permintaan atau gangguan jaringan sementara. Silakan coba lagi beberapa saat.'
      );
    }

    throw createServiceError(
      502,
      'LAYANAN_AI_GAGAL',
      'Terjadi kendala saat berkomunikasi dengan layanan Gemini AI. Silakan coba kembali.'
    );
  } finally {
    fallbackInlineParts.length = 0;
  }
}

module.exports = {
  analyzePdfDocuments,
};