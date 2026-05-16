import express from 'express';
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  getNoteLabels,
  addLabelToNote,
  removeLabelFromNote,
  searchNotes,
} from '../controllers/labelController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Label CRUD
router.get('/', getLabels);
router.post('/', createLabel);
router.put('/:id', updateLabel);
router.delete('/:id', deleteLabel);

// Note-Label associations
router.get('/notes/:id', getNoteLabels);
router.post('/notes/:id', addLabelToNote);
router.delete('/notes/:noteId/:labelId', removeLabelFromNote);

// Search
router.get('/search/notes', searchNotes);

export default router;