const { ai, GEMINI_MODEL, AI_TIMEOUT_MS } = require('../config/gemini');
const { analisisResponseSchema, validateAnalisisPayload } = require('../utils/schema');
const { SYSTEM_INSTRUCTION, buildUserPrompt } = require('./prompt.service');

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function analyzePdfDocuments(files) {
  const fileNames = files.map((file) => file.originalname);

  const documentParts = files.map((file) => ({
    inlineData: {
      data: file.buffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  }));

  const userPrompt = buildUserPrompt(fileNames);

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        createServiceError(
          504,
          'LAYANAN_AI_TIMEOUT',
          'Waktu pemrosesan AI melebihi batas 60 detik. Silakan kurangi jumlah halaman atau coba kembali beberapa saat lagi.'
        )
      );
    }, AI_TIMEOUT_MS);
  });

  try {
    const apiCallPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [...documentParts, { text: userPrompt }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: analisisResponseSchema,
        temperature: 0.3,
        thinkingConfig: {
          thinkingLevel: 'LOW',
        },
      },
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);
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

    throw createServiceError(
      502,
      'LAYANAN_AI_GAGAL',
      'Terjadi kendala saat berkomunikasi dengan layanan Gemini AI. Silakan coba kembali.'
    );
  } finally {
    clearTimeout(timeoutId);
    documentParts.length = 0;
  }
}

module.exports = {
  analyzePdfDocuments,
};