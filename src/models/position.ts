import mongoose, { Schema, Document } from 'mongoose';

export interface IPosition extends Document {
  stockSymbol: string;
  shares: number;
  buyPrice: number;
  buyDate: Date;
  buyTag: string;
  buyCost: number;
  buyNote: string;
  stopLoss: number;
  status: 'Open' | 'Closed';
  sellPrice?: number;
  sellDate?: Date;
  sellTag?: string;
  sellCost?: number;
}

const PositionSchema: Schema = new Schema({
  stockSymbol: { type: String, required: true },
  shares: { type: Number, required: true },
  buyPrice: { type: Number, required: true },
  buyDate: { type: Date, required: true },
  buyTag: { type: String },
  stopLoss: { type: Number, required: true },
  buyNote: { type: String },
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
});

export default mongoose.model<IPosition>('Position', PositionSchema);
