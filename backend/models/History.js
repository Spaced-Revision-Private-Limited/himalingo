import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema({
  chatId:         { type: String, unique: true, required: true },
  userId:         { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'User' },
  originalText:   String,
  translatedText: String,
  mode:           String,
  pinned:         { type: Boolean, default: false },
  updatedAt:      { type: Date, default: Date.now },
});

export default mongoose.models.History || mongoose.model("History", HistorySchema);