import mongoose, { Schema, Document } from 'mongoose';

export interface IPositionStats extends Document {
  positionId: Schema.Types.ObjectId;
  stockSymbol: string;
  gainLoss: number;
  gainLossPercentage: number;
  maxPotentialDrawdown: number;
}

const PositionStatsSchema: Schema = new Schema({
  positionId: { type: Schema.Types.ObjectId, required: true, ref: 'Position' },
  stockSymbol: { type: String, required: true },
  gainLoss: { type: Number, required: true },
  gainLossPercentage: { type: Number, required: true },
  maxPotentialDrawdown: { type: Number, required: true },
});

export default mongoose.model<IPositionStats>('PositionStats', PositionStatsSchema);
