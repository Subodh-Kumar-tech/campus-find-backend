const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// 🔥 GET USER NOTIFICATIONS
router.get("/:email", async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.email }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 🔥 MARK NOTIFICATION AS READ
router.put("/mark-read/:id", async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
