import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    baseCurrency: { type: String, default: 'USD', uppercase: true, minlength: 3, maxlength: 3 },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
