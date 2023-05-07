// models - position
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
  reducedShares: number;
  partialReductions: [];
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
  reducedShares: { type: Number, default: 0 },
  partialReductions: [
    {
      shares: Number,
      sellPrice: Number,
      sellDate: Date,
      sellTag: String,
      sellCost: Number,
      sellNote: String,
      gainLoss: Number,
      gainLossPercentage: Number,
      normalizedGainLossPercentage: Number,
      commission: Number,
    },
  ],
  initialShares: {
    type: Number,
    //required: true,
  },
  
});

PositionSchema.virtual('hasPartialReductions').get(function (this: IPosition) {
  return this.partialReductions && this.partialReductions.length > 0;
});

PositionSchema.set('toJSON', {
  virtuals: true,
});


export default mongoose.model<IPosition>('Position', PositionSchema);
