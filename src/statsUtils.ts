// backend/statsUtils.ts
import PositionModel, { IPosition } from './models/Position';

function countPositionsBySize(positions, minSize, maxSize) {
  return positions.filter(
    (position) =>
      position.initialBuyCost / position.fullPositionSize >= minSize &&
      position.initialBuyCost / position.fullPositionSize < maxSize
  ).length;
}

function getPositionSizeCategory(position: IPosition) {
  const totalBuyCost = position.initialBuyCost;
  const fullPositionSize = position.fullPositionSize;

  if (totalBuyCost < 0.375 * fullPositionSize) {
    return 'quarter';
  } else if (totalBuyCost < 0.75 * fullPositionSize && totalBuyCost >= 0.375 * fullPositionSize) {
    return 'half';
  } else {
    return 'full';
  }
}

function generateHistogramData(positions) {
  const histogram = Array.from({ length: 41 }, () => 0);

  positions.forEach((position) => {
    const gainLossPercentage = position.gainLossPercentage;
    let index;

    if (gainLossPercentage <= -40) {
      index = 0;
    } else if (gainLossPercentage >= 40) {
      index = 40;
    } else {
      index = Math.floor((gainLossPercentage + 40) / 2);
    }

    histogram[index]++;
  });

  return histogram;
}


export async function calculateStats() {
  const closedPositions = await PositionModel.find({ status: 'Closed' });

  let totalGainLoss = 0;
  let totalNormalizedGainLossPercentage = 0;
  let totalGainLossPercentage = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let winningQuarter = 0;
  let losingQuarter = 0;
  let winningHalf = 0;
  let losingHalf = 0;
  let winningFull = 0;
  let losingFull = 0;
  let countQuarter = 0;
  let countHalf = 0;
  let countFull = 0;
  let sumNormalizedGainLossPercentageQuarter = 0;
  let sumNormalizedGainLossPercentageHalf = 0;
  let sumNormalizedGainLossPercentageFull = 0;
  let sumGainLossPercentageQuarter = 0;
  let sumGainLossPercentageHalf = 0;
  let sumGainLossPercentageFull = 0;
  let sumGainQuarter = 0;
  let sumGainHalf = 0;
  let sumGainFull = 0;
  let sumGainTotal = 0;
  let sumLossQuarter = 0;
  let sumLossHalf = 0;
  let sumLossFull = 0;
  let sumLossTotal = 0;
  let sumNormalizedGainTotal = 0;
  let sumNormalizedLossTotal = 0;

  closedPositions.forEach((position) => {
    totalGainLoss += position.gainLoss;
    totalGainLossPercentage += position.gainLossPercentage;
    totalNormalizedGainLossPercentage += position.normalizedGainLossPercentage;

    const positionSizeCategory = getPositionSizeCategory(position);

    if (positionSizeCategory === 'quarter') {
      sumNormalizedGainLossPercentageQuarter += position.normalizedGainLossPercentage;
      sumGainLossPercentageQuarter += position.gainLossPercentage
      countQuarter++;
    } else if (positionSizeCategory === 'half') {
      sumNormalizedGainLossPercentageHalf += position.normalizedGainLossPercentage;
      sumGainLossPercentageHalf += position.gainLossPercentage;
      countHalf++;
    } else {
      sumNormalizedGainLossPercentageFull += position.normalizedGainLossPercentage;
      sumGainLossPercentageFull += position.gainLossPercentage;
      countFull++;
    }

    if (position.gainLossPercentage > 0) {
      sumGainTotal += position.gainLossPercentage;
      sumNormalizedGainTotal += position.normalizedGainLossPercentage;
      winningTrades++;

      if (positionSizeCategory === 'quarter') {
        sumGainQuarter += position.gainLossPercentage;
        winningQuarter++;
      } else if (positionSizeCategory === 'half') {
        sumGainHalf += position.gainLossPercentage;
        winningHalf++;
      } else {
        sumGainFull += position.gainLossPercentage;
        winningFull++;
      }
    } else {
      sumLossTotal += position.gainLossPercentage;
      sumNormalizedLossTotal += position.normalizedGainLossPercentage;
      losingTrades++;

      if (positionSizeCategory === 'quarter') {
        sumLossQuarter += position.gainLossPercentage;
        losingQuarter++;
      } else if (positionSizeCategory === 'half') {
        sumLossHalf += position.gainLossPercentage;
        losingHalf++;
      } else {
        sumLossHalf += position.gainLossPercentage;
        losingFull++;
      }
    }
  });

  const averageNormalizedGainLossPercentageQuarter = countQuarter > 0 ? sumNormalizedGainLossPercentageQuarter / countQuarter : 0;
  const averageNormalizedGainLossPercentageHalf = countHalf > 0 ? sumNormalizedGainLossPercentageHalf / countHalf : 0;
  const averageNormalizedGainLossPercentageFull = countFull > 0 ? sumNormalizedGainLossPercentageFull / countFull : 0;
  const averageGainLossPercentageQuarter = countQuarter > 0 ? sumGainLossPercentageQuarter / countQuarter : 0;
  const averageGainLossPercentageHalf = countHalf > 0 ? sumGainLossPercentageHalf / countHalf : 0;
  const averageGainLossPercentageFull = countFull > 0 ? sumGainLossPercentageFull / countFull : 0;

  const averageGainPercentageQuarter = winningQuarter > 0 ? sumGainQuarter / winningQuarter : 0;
  const averageGainPercentageHalf = winningHalf > 0 ? sumGainHalf / winningHalf : 0;
  const averageGainPercentageFull = winningFull > 0 ? sumGainFull / winningFull : 0;
  const averageGainPercentageTotal = winningTrades > 0 ? sumGainTotal / winningTrades : 0;
  const averageLossPercentageQuarter = losingQuarter > 0 ? sumLossQuarter / losingQuarter : 0;
  const averageLossPercentageHalf = losingHalf > 0 ? sumLossHalf / losingHalf : 0;
  const averageLossPercentageFull = losingFull > 0 ? sumLossFull / losingFull : 0;
  const averageLossPercentageTotal = losingTrades > 0 ? sumLossTotal / losingTrades : 0;

  const averageNormalizedGainPercentageTotal = winningTrades > 0 ? sumNormalizedGainTotal / winningTrades : 0;
  const averageNormalizedLossPercentageTotal = losingTrades > 0 ? sumNormalizedLossTotal / losingTrades : 0;

  const averageGainLossPercentage =
  closedPositions.length > 0
    ? totalGainLossPercentage / closedPositions.length
    : 0;

  const averageNormalizedGainLossPercentage =
    closedPositions.length > 0
      ? totalNormalizedGainLossPercentage / closedPositions.length
      : 0;

  const quarterPositions = countPositionsBySize(closedPositions, 0, 0.375);
  const halfPositions = countPositionsBySize(closedPositions, 0.375, 0.75);
  const fullPositions = countPositionsBySize(closedPositions, 0.75, 10);

  const battingAverageQuarter = winningQuarter + losingQuarter > 0 ? (winningQuarter / (winningQuarter + losingQuarter)) * 100 : 0;
  const battingAverageHalf = winningHalf + losingHalf > 0 ? (winningHalf / (winningHalf + losingHalf)) * 100 : 0;
  const battingAverageFull = winningFull + losingFull > 0 ? (winningFull / (winningFull + losingFull)) * 100 : 0;
  const battingAverageTotal = winningTrades + losingTrades > 0 ? (winningTrades / (winningTrades + losingTrades)) * 100 : 0;

  const rrQuarter = averageGainPercentageQuarter && averageLossPercentageQuarter ? Math.abs(averageGainPercentageQuarter / averageLossPercentageQuarter) : 0;
  const rrHalf = averageGainPercentageHalf && averageLossPercentageHalf ? Math.abs(averageGainPercentageHalf / averageLossPercentageHalf) : 0;
  const rrFull = averageGainPercentageFull && averageLossPercentageFull ? Math.abs(averageGainPercentageFull / averageLossPercentageFull) : 0;
  const rrTotal = averageGainPercentageTotal && averageLossPercentageTotal ? Math.abs(averageGainPercentageTotal / averageLossPercentageTotal) : 0;
  const rrNormalizedTotal = averageNormalizedGainPercentageTotal && averageNormalizedLossPercentageTotal ? Math.abs(averageNormalizedGainPercentageTotal / averageNormalizedLossPercentageTotal) : 0;

  const quarterPositionsList = closedPositions.filter(
    (position) => getPositionSizeCategory(position) === 'quarter'
  );
  const halfPositionsList = closedPositions.filter(
    (position) => getPositionSizeCategory(position) === 'half'
  );
  const fullPositionsList = closedPositions.filter(
    (position) => getPositionSizeCategory(position) === 'full'
  );

  const quarterHistogram = generateHistogramData(quarterPositionsList);
  const halfHistogram = generateHistogramData(halfPositionsList);
  const fullHistogram = generateHistogramData(fullPositionsList);
  const totalHistogram = generateHistogramData(closedPositions);

  return {
    totalGainLoss,
    totalNormalizedGainLossPercentage,
    averageNormalizedGainLossPercentage,
    averageGainLossPercentage,
    closedPositionsCount: closedPositions.length,
    averageNormalizedGainLossPercentageQuarter,
    averageNormalizedGainLossPercentageHalf,
    averageNormalizedGainLossPercentageFull,
    averageGainLossPercentageQuarter,
    averageGainLossPercentageHalf,
    averageGainLossPercentageFull,
    quarterPositions,
    halfPositions,
    fullPositions,
    winningTrades,
    losingTrades,
    winningQuarter,
    losingQuarter,
    winningHalf,
    losingHalf,
    winningFull,
    losingFull,
    averageGainPercentageQuarter,
    averageGainPercentageHalf,
    averageGainPercentageFull,
    averageGainPercentageTotal,
    averageLossPercentageQuarter,
    averageLossPercentageHalf,
    averageLossPercentageFull,
    averageLossPercentageTotal,
    averageNormalizedGainPercentageTotal,
    averageNormalizedLossPercentageTotal,
    battingAverageQuarter,
    battingAverageHalf,
    battingAverageFull,
    battingAverageTotal,
    rrQuarter,
    rrHalf,
    rrFull,
    rrTotal,
    rrNormalizedTotal,
    quarterHistogram,
    halfHistogram,
    fullHistogram,
    totalHistogram,
  };
}
