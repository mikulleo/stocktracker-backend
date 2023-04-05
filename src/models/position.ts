import mongoose, { Schema, Document } from 'mongoose';

export interface IPosition extends Document {
  stockSymbol: string;
  shares: number;
  buyPrice: number;
  buyDate: Date;
  buyTag: string;
  buyCost: number;
  buyNote: string;
  adjustedStopLoss?: number | null;
  status: 'Open' | 'Closed';
  sellPrice?: number;
  sellDate?: Date;
  sellTag?: string;
  sellCost?: number;
  stopLoss: number;
  commission: number;
  currentPrice?: number;
  fullPositionSize: number;
  initialRisk: number;
  adjustedRisk: number;
  positionType: 'long' | 'short';
}

const PositionSchema: Schema = new Schema({
  stockSymbol: { type: String, required: true },
  shares: { type: Number, required: true },
  buyPrice: { type: Number, required: true },
  buyDate: { type: Date, required: true },
  buyTag: { type: String },
  stopLoss: { type: Number, required: true },
  buyNote: { type: String },
  adjustedStopLoss: { type: Number },
  buyCost: { type: Number, required: true},
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open',
  },
  sellPrice: { type: Number },
  sellDate: { type: Date },
  sellTag: { type: String, default: '' },
  sellNote: { type: String },
  sellCost: { type: Number },
  commission: { type: Number },
  currentPrice: { type: Number },
  maxDrawdown: {
    type: Number,
    required: true,
    default: 0,
  },
  gainLoss: {
    type: Number,
    required: true,
    default: 0,
  },
  gainLossPercentage: {
    type: Number,
    required: true,
    default: 0,
  },
  fullPositionSize: { type: Number },
  initialRisk: { type: Number },
  adjustedRisk: { type: Number },
  normalizedGainLossPercentage: {
    type: Number,
    required: true,
    default: 0,
  },
  positionType: { type: String, enum: ['long', 'short'], default: 'long' },
});

export default mongoose.model<IPosition>('Position', PositionSchema);
