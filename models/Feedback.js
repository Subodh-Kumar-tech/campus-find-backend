const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false, // Optional for anonymous or if generic
    },
    name: String, // Cached name for display
    email: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
        type: String,
        enum: ["open", "resolved"],
        default: "open",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
