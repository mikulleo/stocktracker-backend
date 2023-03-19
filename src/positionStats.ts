import Position, { IPosition } from './models/position';
import PositionStats, { IPositionStats } from './models/positionStat';
import mongoose from 'mongoose';
import { getStockPrice } from './routes/stockPrices';

interface OpenPositionStats {
  positionId: mongoose.Schema.Types.ObjectId;
  stockSymbol: string;
  gainLoss: number;
  gainLossPercentage: number;
  maxPotentialDrawdown: number;
}

export const updateCurrentPrice = async (
  positionId: string,
  currentPrice: number
): Promise<void> => {
  await Position.findByIdAndUpdate(positionId, { currentPrice });
};

export async function calculateOpenPositionStats(positions: IPosition[], api_key: string): Promise<OpenPositionStats[]> {
  const positionStatsList: OpenPositionStats[] = [];

  for (const position of positions) {
    const currentPrice = await getStockPrice(position.stockSymbol, api_key);

    if (currentPrice === null) {
      console.error(`Error fetching stock price for ${position.stockSymbol}`);
      continue;
    }

    const gainLoss = (currentPrice * position.shares) - (position.buyPrice * position.shares);
    const gainLossPercentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
    const maxPotentialDrawdown = (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;

    // Check if stockSymbol is not null or undefined
    if (position.stockSymbol) {
      positionStatsList.push({
        positionId: position._id,
        stockSymbol: position.stockSymbol,
        gainLoss,
        gainLossPercentage,
        maxPotentialDrawdown,
      });
    } else {
      console.error(`Error: stockSymbol is null or undefined for position ${position._id}`);
    }
  }

  return positionStatsList;
}

async function savePositionStats(positionStatsList: OpenPositionStats[]): Promise<void> {
  for (const stats of positionStatsList) {
    if (!stats.stockSymbol) {
      console.error(`Error: stockSymbol is missing for position ${stats.positionId}`);
      continue;
    }
    console.log('Stats object:', JSON.stringify(stats, null, 2));

    const newPositionStats = new PositionStats(stats);
    console.log('New PositionStats object:', JSON.stringify(newPositionStats, null, 2));

    try {
      await newPositionStats.save();
    } catch (error) {
      console.error(`Error saving position stats for ${stats.symbol}:`, error);
    }
  }
}

export { savePositionStats };
