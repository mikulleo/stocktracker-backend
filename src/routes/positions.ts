// routes - positions

/*const router = Router();
const api_key_const = process.env.FINNHUB_API_KEY || 'cgb21ahr01ql0m8ri9ngcgb21ahr01ql0m8ri9o0'; */

import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import PositionModel, { IPosition } from '../models/Position';
import axios from 'axios';
import Position from '../models/Position';
import positionStat from '../models/positionStat';

const router = Router();

async function closePosition(id, sharesToClose, sellPrice, sellDate, sellTag, sellCost, sellNote, commission) {
  try {
    const position = await PositionModel.findById(id);
    const initialShares = position.initialShares;

    if (!position) {
      throw new Error('Position not found');
    }

    if (sharesToClose > position.shares) {
      throw new Error('Shares to close exceed the open shares');
    }

    const isFullyClosing = sharesToClose === position.shares;

    const gainLoss = position.positionType === 'short'
      ? (position.buyPrice * position.shares) - (sellPrice * position.shares)
      : (sellPrice * position.shares) - (position.buyPrice * position.shares);

    const gainLossPercentage = position.positionType === 'short'
      ? ((position.buyPrice - sellPrice) / position.buyPrice) * 100
      : ((sellPrice - position.buyPrice) / position.buyPrice) * 100;

    let normalizedGainLossPercentage;
    if (position.fullPositionSize !== null && position.fullPositionSize !== 0) {
      normalizedGainLossPercentage = (position.buyCost / position.fullPositionSize) * gainLossPercentage;
    } else {
      normalizedGainLossPercentage = 0;
    }

    const updatedShares = position.shares - sharesToClose; // reduced number of shares
    const updatedBuyCost = (updatedShares / position.shares) * position.buyCost;

    const partialReduction = {
      shares: sharesToClose,
      sellPrice,
      sellDate,
      sellTag,
      sellCost,
      sellNote,
      gainLoss,
      gainLossPercentage,
      normalizedGainLossPercentage,
      commission,
    };

    let updatedPosition;

    if (isFullyClosing) {
      // Calculate final position stats
      const finalStats = position.partialReductions.concat(partialReduction).reduce((acc, reduction) => {
        // try to add logs here
        acc.gainLoss += reduction.gainLoss;
        acc.normalizedGainLossPercentage += reduction.normalizedGainLossPercentage;
        acc.weightedGainLossPercentage += (reduction.gainLossPercentage * reduction.shares) / initialShares;
        return acc;
      },
      {
        gainLoss: 0,
        normalizedGainLossPercentage: 0,
        weightedGainLossPercentage: 0,
      });

    updatedPosition = await PositionModel.findByIdAndUpdate(
      id,
      {
        status: 'Closed',
        shares: 0,
        buyCost: 0,
        sellPrice,
        sellDate,
        sellTag,
        sellCost,
        sellNote,
        gainLoss: finalStats.gainLoss,
        gainLossPercentage: finalStats.weightedGainLossPercentage,
        normalizedGainLossPercentage: finalStats.normalizedGainLossPercentage,
        commission,
      },
      { new: true }
    );
    } else {
      updatedPosition = await PositionModel.findByIdAndUpdate(
        id,
        {
          shares: updatedShares,
          buyCost: updatedBuyCost,
          partialReductions: [...position.partialReductions, partialReduction],
        },
        { new: true }
      );
    }

    return updatedPosition;
  } catch (error) {
    throw new Error(error.message);
  }
}


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

  const { stockSymbol, shares, fullPositionSize, positionType } = req.body;
  const buyPrice = req.body.buyPrice || 0; // Set default value
  const buyDate = req.body.buyDate || new Date(); // Set default value
  const buyTag = req.body.buyTag || ''; // Set default value
  const stopLoss = req.body.stopLoss || 0; // Set default value
  const buyNote = req.body.buyNote || ''; // Set default value
  const commission = req.body.commission || 0; // Set default value
  const buyCost = buyPrice * shares;
  const status = req.body.status;
  const sellPrice = req.body.sellPrice || '';
  const sellDate = req.body.sellDate || '';
  const sellTag = req.body.sellTag || '';
  const sellNote = req.body.sellNote || '';

  const newPosition = new PositionModel({
    stockSymbol,
    shares,
    buyPrice,
    buyDate,
    stopLoss,
    buyTag,
    buyNote,
    buyCost,
    commission,
    fullPositionSize,
    positionType,
    status,
    sellPrice,
    sellDate,
    sellTag,
    sellNote,
    initialShares: shares,
  });

  try {
    await newPosition.save();
    
    // Check if the status is closed and run the close logic
    if (req.body.status === 'Closed') {      
      //const updatedPosition = await closePosition(newPosition._id, sellPrice, sellDate, sellTag, newPosition.shares*sellPrice, sellNote, 0);
      const updatedPosition = await closePosition(newPosition._id, newPosition.shares, sellPrice, sellDate, sellTag, newPosition.shares*sellPrice, sellNote, commission);

      // Send the closed position as a response
      res.status(201).json(updatedPosition);
    } else {
      res.status(201).json(newPosition);
    }
    //res.status(201).json(newPosition);
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

      if (position.initialRisk == null) {
        position.initialRisk = position.positionType === 'short'
          ? ((position.stopLoss - position.buyPrice) / position.buyPrice) * 100
          : ((position.buyPrice - position.stopLoss) / position.buyPrice) * 100;
      }
      if (position.adjustedStopLoss == null) {
        position.adjustedRisk = 0;
      }
      else {
        position.adjustedRisk = position.positionType === 'short'
          ? ((position.adjustedStopLoss - position.buyPrice) / position.buyPrice) * 100  
          : ((position.buyPrice - position.adjustedStopLoss) / position.buyPrice) * 100;
          
      }

      if (position.currentPrice == null) {
        // Fetch updated price from FinnHub API
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${position.stockSymbol}&token=${process.env.FINNHUB_API_KEY}`);
        const currentPrice = response.data.c;

        // Calculate max drawdown, gain/loss, and gain/loss percentage
        // Update the position object and save it to the database
        position.currentPrice = currentPrice;
        position.stopLoss = position.stopLoss || 0; // Add this line to include the stopLoss field

        position.gainLoss = position.positionType === 'short'
          ? (position.buyPrice * position.shares) - (currentPrice * position.shares)
          : (currentPrice * position.shares) - (position.buyPrice * position.shares);
        
        position.gainLossPercentage = position.positionType === 'short'
          ? ((position.buyPrice - currentPrice) / position.buyPrice) * 100
          : ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        
        if (position.adjustedStopLoss == null) {
          // position.maxDrawdown = (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
          position.maxDrawdown = position.positionType === 'short'
            ? (position.stopLoss * position.shares) > 0 ? (position.stopLoss * position.shares) - (currentPrice * position.shares) : 0
            : (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
        }
        else {
          // position.maxDrawdown = (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
          position.maxDrawdown = position.positionType === 'short'
            ? (position.adjustedStopLoss * position.shares) > 0 ? (position.adjustedStopLoss * position.shares) - (currentPrice * position.shares) : 0
            : (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
        }


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
        
        position.gainLoss = position.positionType === 'short'
          ? (position.buyPrice * position.shares) - (currentPrice * position.shares)
          : (currentPrice * position.shares) - (position.buyPrice * position.shares);
        
        position.gainLossPercentage = position.positionType === 'short'
          ? ((position.buyPrice - currentPrice) / position.buyPrice) * 100
          : ((currentPrice - position.buyPrice) / position.buyPrice) * 100;

        position.adjustedRisk = position.positionType === 'short'
          ? ((position.adjustedStopLoss - position.buyPrice) / position.buyPrice) * 100  
          : ((position.buyPrice - position.adjustedStopLoss) / position.buyPrice) * 100;
        // position.adjustedRisk = position.adjustedStopLoss ? ((position.buyPrice - position.adjustedStopLoss) / position.buyPrice) * 100 : position.initialRisk;

        if (position.adjustedStopLoss == null) {
          // position.maxDrawdown = (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
          position.maxDrawdown = position.positionType === 'short'
            ? (position.stopLoss * position.shares) > 0 ? (position.stopLoss * position.shares) - (currentPrice * position.shares) : 0
            : (position.stopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.stopLoss * position.shares) : 0;
          position.adjustedRisk = 0;
        }
        else {
          // position.maxDrawdown = (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
          position.maxDrawdown = position.positionType === 'short'
            ? (position.adjustedStopLoss * position.shares) > 0 ? (position.adjustedStopLoss * position.shares) - (currentPrice * position.shares) : 0
            : (position.adjustedStopLoss * position.shares) > 0 ? (currentPrice * position.shares) - (position.adjustedStopLoss * position.shares) : 0;
          // position.adjustedRisk = position.adjustedStopLoss ? ((position.buyPrice - position.adjustedStopLoss) / position.buyPrice) * 100 : position.initialRisk;
          position.adjustedRisk = position.positionType === 'short'
            ? ((position.adjustedStopLoss - position.buyPrice) / position.buyPrice) * 100  
            : ((position.buyPrice - position.adjustedStopLoss) / position.buyPrice) * 100;
       
        }

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
  const id = req.params.id;
  const { sharesToClose, sellPrice, sellDate, sellTag, sellNote, commission } = req.body;
  const sellCost = sharesToClose * sellPrice;

  try {
    const updatedPosition = await closePosition(id, sharesToClose, sellPrice, sellDate, sellTag, sellCost, sellNote, commission);
    res.status(200).json(updatedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Modify a position
router.patch('/:id/modify', async (req, res) => {
  const { id } = req.params;
  const { buyPrice, buyDate, buyTag, shares, stopLoss, sellPrice, sellDate, sellTag, adjustedStopLoss } = req.body;

  try {
    const position = await PositionModel.findById(id);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    const buyCost = shares * (buyPrice || 0);
    const sellCost = shares * (sellPrice || 0);

    const initialRisk = position.positionType === 'short'
          ? ((stopLoss - buyPrice) / buyPrice) * 100
          : ((buyPrice - stopLoss) / buyPrice) * 100;

    let gainLoss = null;
    let gainLossPercentage = null;
    let normalizedGainLossPercentage = null;

    if (position.status === "Closed" && sellPrice && buyPrice) {
      gainLoss = (sellPrice * shares) - (buyPrice * shares);
      gainLossPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
      if (position.fullPositionSize !== null && position.fullPositionSize !== 0) {
        normalizedGainLossPercentage = (buyCost / position.fullPositionSize) * gainLossPercentage;
      }
      else {
        normalizedGainLossPercentage = 0;
      }  
    }

    const updateObject = {
      buyPrice,
      buyDate,
      buyTag,
      buyCost,
      shares,
      initialRisk,
      stopLoss,
      sellPrice,
      sellDate,
      sellTag,
      sellCost,
      adjustedStopLoss,
      ...(gainLoss !== null && { gainLoss }),
      ...(gainLossPercentage !== null && { gainLossPercentage }),
      ...(normalizedGainLossPercentage !== null && { normalizedGainLossPercentage }),
    };

    const updatedPosition = await PositionModel.findByIdAndUpdate(id, updateObject, { new: true });

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

router.get('/', async (req, res) => {
  try {
    const positions = await PositionModel.find();
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch closed positions
router.get('/closed', async (req, res) => {
  try {
    const closedPositions = await PositionModel.find({ status: 'Closed' });
    res.json(closedPositions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/*
// Reduce a position
router.patch('/:id/reduce', async (req, res) => {
  const id = req.params.id;
  const { reduceShares } = req.body;

  try {
    const position = await PositionModel.findById(id);

    if (!position) {
      throw new Error('Position not found');
    }

    if (position.shares - position.reducedShares < reduceShares) {
      throw new Error('Cannot reduce more shares than available');
    }

    const updatedPosition = await PositionModel.findByIdAndUpdate(
      id,
      {
        reducedShares: position.reducedShares + reduceShares,
        shares: position.shares - reduceShares,
      },
      { new: true }
    );

    res.status(200).json(updatedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});*/

export default router;
