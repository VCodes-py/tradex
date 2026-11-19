import mongoose from 'mongoose';

export const ASSET_CLASSES = ['indian_stock', 'intl_stock', 'crypto', 'forex', 'us_stock'];

const holdingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, trim: true, default: '' },
    assetClass: { type: String, enum: ASSET_CLASSES, required: true },
    // Currency the asset is priced and costed in (e.g. USD for AAPL, INR for RELIANCE.NS).
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    exchange: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    avgCost: { type: Number, required: true, min: 0 }, // per unit, in `currency`
  },
  { timestamps: true }
);

holdingSchema.index({ user: 1, symbol: 1 }, { unique: true });

export const Holding = mongoose.model('Holding', holdingSchema);
