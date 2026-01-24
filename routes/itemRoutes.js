const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const itemController = require("../controllers/itemController");

// ✅ TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Item route working");
});

// 🔥 CREATE ITEM
router.post("/", upload.single("itemImage"), itemController.createItem);

// 🔥 BATCH MATCHING (RETROACTIVE)
router.post("/batch-match", itemController.runBatchMatching);

// 🔥 GET ALL ITEMS
router.get("/", itemController.getItems);

// 🔥 GET SINGLE ITEM BY ID (THIS FIXES YOUR ERROR)
router.get("/:id", itemController.getItemById);

// 🔥 CLAIM ITEM
router.post("/:id/claim", upload.single("proofImage"), itemController.claimItem);

// 🔥 USER STATS
router.get("/stats/:email", itemController.getUserStats);

// 🔥 USER ACTIVITY
router.get("/activity/:email", itemController.getUserActivity);

module.exports = router;
