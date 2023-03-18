import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import PositionModel, { IPosition } from '../models/position';

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

  const { stockSymbol, shares } = req.body;
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
  });

  try {
    await newPosition.save();
    res.status(201).json(newPosition);
  } catch (error) {
    console.error('Error:', error); // Add this line to log the error
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const positions = await PositionModel.find();
    res.status(200).json(positions);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// Close a position
router.patch('/:id/modify', async (req, res) => {
  const { id } = req.params;
  const { buyPrice, buyDate, buyTag, shares, sellPrice, sellDate, sellTag } = req.body;

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
      },
      { new: true }
    );

    res.status(200).json(updatedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/open', async (req, res) => {
  try {
    const positions = await PositionModel.find({ status: 'Open' });
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;
