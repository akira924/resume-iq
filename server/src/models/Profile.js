import mongoose from 'mongoose';

export const SENIORITY_LEVELS = Object.freeze(['junior', 'mid', 'senior', 'staff', 'lead', 'principal']);

// Pre-filled for users who haven't saved a profile yet. Both fields are required on save.
export const DEFAULT_SENIORITY = 'senior';
export const DEFAULT_YEARS_OF_EXPERIENCE = 10;

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    period: { type: String, required: true },
    location: { type: String, default: '' },
    bullets: { type: Number, min: 1, max: 20, default: null },
  },
  { _id: false },
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    location: { type: String, default: '' },
    period: { type: String, default: '' },
  },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  {
    institution: { type: String, default: '' },
    name: { type: String, default: '' },
    date: { type: String, default: '' },
  },
  { _id: false },
);

// One profile per user. Name and email live on User; everything else is here.
const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    website: { type: String, default: '' },
    seniority: { type: String, enum: [...SENIORITY_LEVELS, ''], default: DEFAULT_SENIORITY },
    yearsOfExperience: { type: Number, min: 1, max: 20, default: DEFAULT_YEARS_OF_EXPERIENCE },
    experiences: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
  },
  { timestamps: true },
);

export const Profile = mongoose.model('Profile', profileSchema);
