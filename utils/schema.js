const { Type } = require('@google/genai');

const analisisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ringkasan_dokumen: {
      type: Type.ARRAY,
      description: 'Ringkasan terstruktur untuk setiap berkas jurnal PDF yang diunggah.',
      items: {
        type: Type.OBJECT,
        properties: {
          nama_file: {
            type: Type.STRING,
            description: 'Nama berkas PDF asli persis seperti yang dilampirkan.',
          },
          topik: {
            type: Type.STRING,
            description: 'Fokus utama atau topik penelitian dalam artikel.',
          },
          metode: {
            type: Type.STRING,
            description: 'Metode, desain, atau pendekatan penelitian yang digunakan.',
          },
          temuan_utama: {
            type: Type.STRING,
            description: 'Hasil atau temuan kunci dari penelitian tersebut.',
          },
          keterbatasan: {
            type: Type.STRING,
            description: 'Keterbatasan penelitian atau saran penelitian lanjutan yang tercatat di artikel.',
          },
        },
        required: ['nama_file', 'topik', 'metode', 'temuan_utama', 'keterbatasan'],
      },
    },
    research_gap: {
      type: Type.ARRAY,
      description: 'Daftar celah penelitian spesifik yang belum terjawab pada kumpulan literatur.',
      items: {
        type: Type.OBJECT,
        properties: {
          gap: {
            type: Type.STRING,
            description: 'Pernyataan celah penelitian spesifik yang ditemukan.',
          },
          alasan: {
            type: Type.STRING,
            description: 'Argumentasi logis berdasarkan perbandingan keterbatasan antar-jurnal.',
          },
          sumber: {
            type: Type.ARRAY,
            description: 'Daftar nama berkas PDF sumber yang mendukung klaim celah penelitian ini.',
            items: {
              type: Type.STRING,
            },
          },
        },
        required: ['gap', 'alasan', 'sumber'],
      },
    },
    paragraf_research_gap: {
      type: Type.STRING,
      description: 'Narasi sintesis komprehensif dalam bahasa Indonesia akademik yang menghubungkan seluruh celah penelitian.',
    },
    rekomendasi_judul: {
      type: Type.ARRAY,
      description: '3 hingga 5 rekomendasi judul penelitian baru yang tajam, spesifik, dan orisinal.',
      items: {
        type: Type.OBJECT,
        properties: {
          judul: {
            type: Type.STRING,
            description: 'Rekomendasi judul penelitian baru.',
          },
          alasan_kebaruan: {
            type: Type.STRING,
            description: 'Penjelasan bagaimana judul tersebut menjawab celah penelitian yang ditemukan.',
          },
          pendekatan_disarankan: {
            type: Type.STRING,
            description: 'Saran kerangka metodologi untuk mengeksekusi penelitian tersebut.',
          },
        },
        required: ['judul', 'alasan_kebaruan', 'pendekatan_disarankan'],
      },
    },
  },
  required: [
    'ringkasan_dokumen',
    'research_gap',
    'paragraf_research_gap',
    'rekomendasi_judul',
  ],
};

function validateAnalisisPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const hasRingkasan =
    Array.isArray(payload.ringkasan_dokumen) && payload.ringkasan_dokumen.length > 0;
  const hasGap =
    Array.isArray(payload.research_gap) && payload.research_gap.length > 0;
  const hasParagraf =
    typeof payload.paragraf_research_gap === 'string' &&
    payload.paragraf_research_gap.trim().length > 0;
  const hasJudul =
    Array.isArray(payload.rekomendasi_judul) && payload.rekomendasi_judul.length > 0;

  return hasRingkasan && hasGap && hasParagraf && hasJudul;
}

module.exports = {
  analisisResponseSchema,
  validateAnalisisPayload,
};