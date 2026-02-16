const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  claimantName: String,
  claimantContact: String,
  proofAnswer: String,
  proofImage: String, // 🔥 Added proof image field
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
  itemCategory: {
    type: String,
    enum: ["Electronics", "Clothing", "Books & Notes", "Keys & IDs", "Others"],
    default: "Others",
  },
  location: String,
  contactInfo: String,
  itemImage: String,

  // 🔥 CLAIMS
  claims: [claimSchema],

  postedBy: {
    type: String, // Store email for simplicity in this project
    required: false,
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Item", itemSchema);
