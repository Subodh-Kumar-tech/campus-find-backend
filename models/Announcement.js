const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["info", "alert", "warning"],
        default: "info",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Announcement", announcementSchema);
