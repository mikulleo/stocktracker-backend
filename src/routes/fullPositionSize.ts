import { Router } from 'express';
import FullPositionSizeChange, { IFullPositionSizeChange } from '../models/fullPositionSizeChange';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const latestChange = await FullPositionSizeChange.findOne({ user_id: 'your_user_id' }).sort({ created_at: -1 });
    res.json(latestChange);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
   
    const { changed_to, user_id } = req.body;
  
    try {
        const latestFullPositionSize = await FullPositionSizeChange.findOne({ user_id: 'your_user_id' }).sort({ created_at: -1 });
  
        const newFullPositionSize = new FullPositionSizeChange({
          changed_from: latestFullPositionSize ? latestFullPositionSize.changed_to : 0,
          changed_to: changed_to,
          current_full_position_size: changed_to,
          user_id: user_id,
        });
  
        const fullPositionSize = await newFullPositionSize.save();
  
        res.json(fullPositionSize);
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
        res.status(400).json({ message: err.message });
      }
});
  

export default router;
