import { Schema, model, Document } from 'mongoose';

export interface IFullPositionSizeChange extends Document {
  current_full_position_size: number;
  changed_from: number;
  changed_to: number;
  user_id: string;
  created_at: Date;
}

const FullPositionSizeChangeSchema = new Schema<IFullPositionSizeChange>({
  current_full_position_size: { type: Number, required: true },
  changed_from: { type: Number, required: true },
  changed_to: { type: Number, required: true },
  user_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export default model<IFullPositionSizeChange>('FullPositionSizeChange', FullPositionSizeChangeSchema);
