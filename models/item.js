const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  claimantName: String,
  claimantContact: String,
  proofAnswer: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ["lost", "found"],
    required: true,
  },
  location: String,
  contactInfo: String,
  itemImage: String,

  // 🔥 CLAIMS
  claims: [claimSchema],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Item", itemSchema);
