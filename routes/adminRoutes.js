const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Item = require("../models/Item");

const Announcement = require("../models/Announcement");
const Feedback = require("../models/Feedback");
const AuditLog = require("../models/AuditLog");

// Helper to log admin actions
const logAction = async (adminId, adminName, action, targetId, details) => {
    try {
        await AuditLog.create({ adminId, adminName, action, targetId, details });
    } catch (err) {
        console.error("Failed to create audit log:", err);
    }
};

/* =========================
   GET ADMIN STATS
========================= */
router.get("/stats", async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const itemCount = await Item.countDocuments();
        const claimCount = await Item.countDocuments({ isClaimed: true });

        res.json({
            users: userCount,
            items: itemCount,
            claims: claimCount
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
});

/* =========================
   GET ALL USERS
========================= */
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password"); // Exclude password
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

/* =========================
   DELETE USER
========================= */
router.delete("/users/:id", async (req, res) => {
    try {
        console.log(`Attempting to delete user with ID: ${req.params.id}`);
        const user = await User.findByIdAndDelete(req.params.id);
        if (user) {
            console.log(`User deleted: ${user.email}`);
            const adminName = req.headers['x-admin-name'] || "Admin";
            await logAction(null, adminName, "DELETE_USER", req.params.id, `Deleted user ${user.fullName}`);
        } else {
            console.log(`User not found with ID: ${req.params.id}`);
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user" });
    }
});

/* =========================
   DELETE ITEM
========================= */
router.delete("/items/:id", async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (item) {
            const adminName = req.headers['x-admin-name'] || "Admin";
            await logAction(null, adminName, "DELETE_ITEM", req.params.id, `Deleted item ${item.title}`);
        }
        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting item" });
    }
});

/* =========================
   GET RECENT ACTIVITY
========================= */
router.get("/activity", async (req, res) => {
    try {
        // Fetch last 5 items
        const recentItems = await Item.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Map to normalized format
        const activity = recentItems.map(item => ({
            _id: item._id,
            type: 'item_reported',
            entityName: item.title,
            user: item.postedBy,
            status: item.category, // lost/found
            date: item.createdAt
        }));

        res.json(activity);
    } catch (error) {
        res.status(500).json({ message: "Error fetching activity" });
    }
});

/* =========================
   GET REPORT DATA (Items Export)
========================= */
router.get("/report/items", async (req, res) => {
    try {
        const items = await Item.find()
            .sort({ createdAt: -1 })
            .lean();

        // Format data for easier CSV/Preview consumption
        const reportData = items.map(item => ({
            _id: item._id,
            title: item.title,
            category: item.category,
            itemCategory: item.itemCategory || "Others",
            location: item.location,
            reporter: item.postedBy || "Anonymous",
            status: item.isClaimed ? "Resolved" : "Open",
            date: item.date || item.createdAt
        }));

        res.json(reportData);
    } catch (error) {
        res.status(500).json({ message: "Error generating report data" });
    }
});



/* =========================
   CLAIMS MANAGEMENT
========================= */
// Get all items with claims
router.get("/claims", async (req, res) => {
    try {
        const itemsWithClaims = await Item.find({ "claims.0": { $exists: true } });

        // Flatten structure for easy frontend consumption
        let allClaims = [];
        itemsWithClaims.forEach(item => {
            item.claims.forEach(claim => {
                allClaims.push({
                    itemId: item._id,
                    itemTitle: item.title,
                    itemImage: item.itemImage,
                    itemCategory: item.category, // 🔥 Added Category
                    claimId: claim._id,
                    claimantName: claim.claimantName,
                    claimantContact: claim.claimantContact,
                    proofAnswer: claim.proofAnswer,
                    proofImage: claim.proofImage,
                    status: claim.status,
                    date: claim.createdAt
                });
            });
        });

        res.json(allClaims);
    } catch (error) {
        res.status(500).json({ message: "Error fetching claims" });
    }
});

// Moderate Claim (Approve/Reject)
router.put("/claims/:itemId/:claimId", async (req, res) => {
    try {
        const { status } = req.body; // approved/rejected
        const { itemId, claimId } = req.params;

        const item = await Item.findById(itemId);
        if (!item) return res.status(404).json({ message: "Item not found" });

        const claim = item.claims.id(claimId);
        if (!claim) return res.status(404).json({ message: "Claim not found" });

        claim.status = status;

        // If approved, mark item as claimed and reject others? 
        // For now, just update status. logic can be extended.
        if (status === "approved") {
            item.isClaimed = true;
        }

        await item.save();

        await logAction(null, "Admin", status === "approved" ? "APPROVE_CLAIM" : "REJECT_CLAIM", claimId, `Claim by ${claim.claimantName} for ${item.title}`);

        res.json({ message: `Claim ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: "Error updating claim" });
    }
});

/* =========================
   ANNOUNCEMENTS
========================= */
// Create Announcement
router.post("/announcements", async (req, res) => {
    try {
        const { message, type } = req.body;
        const newAnnouncement = new Announcement({ message, type });
        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(500).json({ message: "Error creating announcement" });
    }
});

// Get Active Announcements (Public/Admin)
router.get("/announcements", async (req, res) => {
    try {
        // Return latest active announcement
        const announcement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: "Error fetching announcement" });
    }
});


/* =========================
   ANALYTICS DATA
========================= */
router.get("/analytics/data", async (req, res) => {
    try {
        const lostCount = await Item.countDocuments({ category: "lost" });
        const foundCount = await Item.countDocuments({ category: "found" });
        const resolvedCount = await Item.countDocuments({ isClaimed: true });

        // Aggregate items by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await Item.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    lost: { $sum: { $cond: [{ $eq: ["$category", "lost"] }, 1, 0] } },
                    found: { $sum: { $cond: [{ $eq: ["$category", "found"] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            distribution: [
                { name: "Lost Items", value: lostCount, fill: "#EF4444" }, // Red
                { name: "Found Items", value: foundCount, fill: "#22C55E" }, // Green
                { name: "Claimed/Resolved", value: resolvedCount, fill: "#3B82F6" } // Blue
            ],
            trends: dailyStats.map(stat => ({
                date: stat._id,
                lost: stat.lost,
                found: stat.found
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching analytics" });
    }
});

/* =========================
   FEEDBACK SYSTEM
========================= */
// Submit Feedback (User)
router.post("/feedback", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const newFeedback = new Feedback({ name, email, subject, message });
        await newFeedback.save();
        res.status(201).json({ message: "Feedback submitted" });
    } catch (error) {
        res.status(500).json({ message: "Error submitting feedback" });
    }
});

// Get All Feedback (Admin)
router.get("/feedback", async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: "Error fetching feedback" });
    }
});

// Resolve Feedback
router.put("/feedback/:id", async (req, res) => {
    try {
        await Feedback.findByIdAndUpdate(req.params.id, { status: "resolved" });
        const adminName = req.headers['x-admin-name'] || "Admin";
        await logAction(null, adminName, "RESOLVE_FEEDBACK", req.params.id, "Marked feedback as resolved");
        res.json({ message: "Marked as resolved" });
    } catch (error) {
        res.status(500).json({ message: "Error updating feedback" });
    }
});

/* =========================
   AUDIT LOGS
========================= */
router.get("/audit-logs", async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching audit logs" });
    }
});

// 🔥 Clear All Audit Logs (Super Admin Only)
router.delete("/audit-logs", async (req, res) => {
    try {
        await AuditLog.deleteMany({});
        // Log the reset action (ironically, this will be the first log after clearing)
        const adminName = req.headers['x-admin-name'] || "Super Admin";
        await AuditLog.create({
            adminId: "system",
            adminName: adminName,
            action: "SYSTEM_RESET",
            targetId: "all",
            details: "Cleared all audit logs"
        });
        res.json({ message: "Audit logs cleared successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error clearing audit logs" });
    }
});

module.exports = router;
