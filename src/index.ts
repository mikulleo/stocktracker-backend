import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import positionsRouter from './routes/positions';
import stockPricesRouter from './routes/stockPrices';
import fullPositionSizeRouter from './routes/fullPositionSize';

dotenv.config();

const app = express();
//const PORT = process.env.PORT || 5000;
const PORT = process.env.PORT

app.use(cors());
app.use(express.json());
app.use('/api/stock-prices', stockPricesRouter);
app.use('/api/full-position-size', fullPositionSizeRouter);

mongoose.connect(process.env.MONGODB_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', () => {
  console.log('MongoDB connection established successfully');
});

app.use('/positions', positionsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
