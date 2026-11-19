import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE, STATUS } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: Number,
      enum: Object.values(ROLE),
      default: ROLE.USER,
    },
    status: {
      type: Number,
      enum: Object.values(STATUS),
      default: STATUS.INACTIVE,
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
  };
};

export const User = mongoose.model('User', userSchema);
