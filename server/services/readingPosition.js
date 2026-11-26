function pageAtPercent(percent, pages) {
  return Math.round((percent * pages) / 100);
}

module.exports = { pageAtPercent };
