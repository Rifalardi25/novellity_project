function renderHomePage(req, res) {
  const maxFiles = parseInt(process.env.MAX_FILES, 10) || 5;
  const maxTotalMb = parseInt(process.env.MAX_TOTAL_MB, 10) || 4;

  return res.render('index', {
    title: 'Novellity - Asisten Sintesis Literatur & Pemetaan Research Gap',
    maxFiles,
    maxTotalMb,
  });
}

module.exports = {
  renderHomePage,
};