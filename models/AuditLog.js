const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: String, // Relaxed from ObjectId to String
        required: false,
    },
    adminName: String, // Cached for display
    action: {
        type: String, // Relaxed: Removed enum validation
        required: true,
    },
    targetId: String, // ID of the user/item/feedback affected
    details: String, // Optional description
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
