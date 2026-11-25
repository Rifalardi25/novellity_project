function renderHomePage(req, res) {
  const maxFiles = parseInt(process.env.MAX_FILES, 10) || 10;
  const maxTotalMb = parseInt(process.env.MAX_TOTAL_MB, 10) || 15;

  return res.render('index', {
    title: 'Novellity - Asisten Sintesis Literatur & Pemetaan Research Gap',
    maxFiles,
    maxTotalMb,
  });
}

module.exports = {
  renderHomePage,
};