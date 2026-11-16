function sendSuccess(res, data, meta = {}, catatanVerifikasi = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    catatan_verifikasi:
      catatanVerifikasi ||
      'Hasil disusun berdasarkan dokumen yang diunggah; wajib diverifikasi ulang bersama dosen pembimbing.',
    meta,
  });
}

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};