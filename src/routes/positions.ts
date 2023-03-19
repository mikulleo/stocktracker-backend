/*import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import PositionModel, { IPosition } from '../models/position';
import { savePositionStats } from '../positionStats';
import { calculateOpenPositionStats, updateCurrentPrice } from '../positionStats';
import axios from 'axios';

const router = Router();

const api_key_const = process.env.FINNHUB_API_KEY || 'cgb21ahr01ql0m8ri9ngcgb21ahr01ql0m8ri9o0'; */

import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import PositionModel, { IPosition } from '../models/Position';
import axios from 'axios';
import Position from '../models/Position';

const router = Router();

// Add validation rules
const buyOrderValidationRules = [
  check('stockSymbol').notEmpty().withMessage('Stock Symbol is required'),
  check('shares').notEmpty().withMessage('Number of Shares is required'),
];

router.post('/add', buyOrderValidationRules, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { stockSymbol, shares, fullPositionSize } = req.body;
  const buyPrice = req.body.buyPrice || 0; // Set default value
  const buyDate = req.body.buyDate || new Date(); // Set default value
  const buyTag = req.body.buyTag || ''; // Set default value
  const stopLoss = req.body.stopLoss || 0; // Set default value
  const buyNote = req.body.buyNote || ''; // Set default value
  const buyCost = buyPrice * shares;

  const newPosition = new PositionModel({
    stockSymbol,
    shares,
    buyPrice,
    buyDate,
    stopLoss,
    buyTag,
    buyNote,
    buyCost,
    fullPositionSize,
  });

  try {
    await newPosition.save();
    res.status(201).json(newPosition);
  } catch (error) {
    console.error('Error:', error); // Add this line to log the error
    res.status(400).json({ message: error.message });
  }
});

router.get('/open', async (req, res) => {
  try {
    const updatePrices = req.query.updatePrices === 'true';
    let openPositions = await PositionModel.find({ status: 'Open' });

    for (let position of openPositions) {
      if (position.currentPrice == null) {
        // Fetch updated price from FinnHub API
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${position.stockSymbol}&token=${process.env.FINNHUB_API_KEY}`);
        const currentPrice = response.data.c;

        // Calculate max drawdown, gain/loss, and gain/loss percentage
        // Update the position object and save it to the database
        position.currentPrice = currentPrice;
        position.stopLoss = position.stopLoss || 0; // Add this line to include the stopLoss field
        if (position.adjustedStopLoss == null) {
          position.maxDrawdown = (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
        }
        else {
          position.maxDrawdown = (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
        }
        position.gainLoss = (currentPrice * position.shares) - (position.buyPrice * position.shares);
        position.gainLossPercentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        await position.save();
      }
    } 

    if (updatePrices) {
      for (let position of openPositions) {
        // Fetch updated price from FinnHub API
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${position.stockSymbol}&token=${process.env.FINNHUB_API_KEY}`);
        const currentPrice = response.data.c;

        // Calculate max drawdown, gain/loss, and gain/loss percentage
        // Update the position object and save it to the database
        position.currentPrice = currentPrice;
        position.stopLoss = position.stopLoss || 0; // Add this line to include the stopLoss field
        if (position.adjustedStopLoss == null) {
          position.maxDrawdown = (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
        }
        else {
          position.maxDrawdown = (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
        }
        position.gainLoss = (currentPrice * position.shares) - (position.buyPrice * position.shares);
        position.gainLossPercentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        await position.save();
      }
    }

    res.json(openPositions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Close a position
router.patch('/:id/close', async (req, res) => {
  const { id } = req.params;
  const { sellPrice, sellDate, sellTag, sellNote } = req.body;

  try {
    const position = await PositionModel.findById(id);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    if (position.status === 'Closed') {
      return res.status(400).json({ message: 'Position is already closed' });
    }

    const sellCost = position.shares * (sellPrice || 0);

    const updatedPosition = await PositionModel.findByIdAndUpdate(
      id,
      {
        status: 'Closed',
        sellPrice,
        sellDate,
        sellTag,
        sellCost,
        sellNote,
      },
      { new: true }
    );

    res.status(200).json(updatedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Modify a position
router.patch('/:id/modify', async (req, res) => {
  const { id } = req.params;
  const { buyPrice, buyDate, buyTag, shares, sellPrice, sellDate, sellTag, adjustedStopLoss } = req.body;

  try {
    const position = await PositionModel.findById(id);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    const buyCost = position.shares * (buyPrice || 0);
    const sellCost = position.shares * (sellPrice || 0);

    const updatedPosition = await PositionModel.findByIdAndUpdate(
      id,
      {
        buyPrice,
        buyDate,
        buyTag,
        buyCost,
        shares,
        sellPrice,
        sellDate,
        sellTag,
        sellCost,
        adjustedStopLoss
      },
      { new: true }
    );

    res.status(200).json(updatedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const positions = await PositionModel.find();
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;
