const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String, // Email of the user receiving the notification
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["match_found", "claim_update", "other"],
        default: "other"
    },
    relatedItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Notification", notificationSchema);
