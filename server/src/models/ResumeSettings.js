import mongoose from 'mongoose';

// The Resume page's customization panel, one document per user.
// Values are checked in validation/resumeSettings.js before saving.
const resumeSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    margins: {
      vertical: { type: Number, required: true },
      horizontal: { type: Number, required: true },
    },
    sectionOrder: { type: [String], required: true },
    fontFamily: { type: String, required: true },
    fontSizes: {
      name: { type: Number, required: true },
      headline: { type: Number, required: true },
      sectionTitle: { type: Number, required: true },
      body: { type: Number, required: true },
    },
    headerAlign: { type: String, required: true },
    sectionTitleAlign: { type: String, required: true },
    showBorders: { type: Boolean, required: true },
    showContactIcons: { type: Boolean, required: true },
    entryLayout: { type: Number, required: true },
    theme: { type: String, required: true },
  },
  { timestamps: true },
);

export const ResumeSettings = mongoose.model('ResumeSettings', resumeSettingsSchema);
