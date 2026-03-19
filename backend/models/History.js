const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userEmail: { type: String, required: true }, // Links history to a specific user
  originalText: { type: String, required: true },
  translatedText: { type: String, required: true },
  mode: { type: String, default: 'translate' }, // 'translate' or 'chat'
  isStarred: { type: Boolean, default: false }, // For the "Cards" feature
  createdAt: { type: Date, default: Date.now }
});




module.exports = mongoose.model('History', HistorySchema);