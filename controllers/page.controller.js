const MAX_FILES = parseInt(process.env.MAX_FILES, 10) || 10;
const MAX_TOTAL_MB = parseInt(process.env.MAX_TOTAL_MB, 10) || 15;

function renderHomePage(req, res) {
  return res.render('index', {
    title: 'Novellity | Sintesis Literatur & Rekomendasi Judul Ilmiah',
    maxFiles: MAX_FILES,
    maxTotalMb: MAX_TOTAL_MB,
  });
}

module.exports = {
  renderHomePage,
};