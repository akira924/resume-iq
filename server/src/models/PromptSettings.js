import mongoose from 'mongoose';

// The AI Prompt page's editable prompts, one document per user. A missing or null
// field means the user hasn't customized it and the default in routes/prompts.js applies.
const promptSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    qaPrompt: { type: String, default: null },
  },
  { timestamps: true },
);

export const PromptSettings = mongoose.model('PromptSettings', promptSettingsSchema);
