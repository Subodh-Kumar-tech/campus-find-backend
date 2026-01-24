const Item = require("../models/Item");
const sendEmail = require("../utils/sendEmail");

const Notification = require("../models/Notification");

// 🧠 HELPER: Check and Notify Matches
const checkAndNotifyMatches = async (newItem) => {
  if (!newItem.postedBy || !newItem.postedBy.includes("@")) return;

  const targetCategory = newItem.category === "lost" ? "found" : "lost";

  // Simple regex search on title (case-insensitive)
  const regex = new RegExp(newItem.title.split(" ").join("|"), "i");

  const similarItems = await Item.find({
    category: targetCategory,
    title: { $regex: regex }
  });

  let notificationsCreated = 0;

  for (const match of similarItems) {
    if (match.postedBy && match.postedBy.includes("@") && match.postedBy !== newItem.postedBy) {

      // Check for existing notification to avoid duplicates
      const existingNotification = await Notification.findOne({
        userId: match.postedBy,
        relatedItemId: newItem._id,
        type: "match_found"
      });

      if (existingNotification) continue;

      // 1. Create DB Notification
      const notificationMessage = newItem.category === "lost"
        ? `Someone posted a LOST item similar to your found item: "${newItem.title}"`
        : `Someone found an item that might match your lost item: "${newItem.title}"`;

      await Notification.create({
        userId: match.postedBy,
        message: notificationMessage,
        type: "match_found",
        relatedItemId: newItem._id
      });

      notificationsCreated++;

      // 2. Send Email Notification
      const emailSubject = "Potential Match Found!";
      const emailBody = `
            Hello,
            
            ${notificationMessage}
            
            Please check the dashboard to view details.
            
            Regards,
            Campus Find Team
            `;

      try {
        await sendEmail({
          email: match.postedBy,
          subject: emailSubject,
          message: emailBody
        });
      } catch (err) {
        console.error("Failed to send match email", err);
      }
    }
  }
  return notificationsCreated;
};

// 🔥 CREATE ITEM
exports.createItem = async (req, res) => {
  try {
    const newItem = new Item({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      contactInfo: req.body.contactInfo,
      itemImage: req.file ? req.file.path : "",
      postedBy: req.body.postedBy || "",
    });

    await newItem.save();

    // Trigger Smart Matching
    await checkAndNotifyMatches(newItem);

    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🔥 BATCH MATCHING (RETROACTIVE)
exports.runBatchMatching = async (req, res) => {
  try {
    const allItems = await Item.find();
    let totalNotifications = 0;

    console.log(`Starting batch matching for ${allItems.length} items...`);

    for (const item of allItems) {
      const count = await checkAndNotifyMatches(item);
      totalNotifications += count;
    }

    res.json({
      message: "Batch matching complete",
      itemsScanned: allItems.length,
      notificationsGenerated: totalNotifications
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET ALL ITEMS
exports.getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET SINGLE ITEM BY ID (DETAIL PAGE)
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 CLAIM ITEM
exports.claimItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { claimantName, claimantContact, proofAnswer } = req.body;

    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.claims.push({
      claimantName,
      claimantContact,
      proofAnswer,
      proofImage: req.file ? req.file.path : "", // 🔥 Save image path
    });

    await item.save();

    // 📧 SEND EMAIL NOTIFICATION
    if (item.postedBy && item.postedBy.includes("@")) {
      const isLostItem = item.category === "lost"; // Reporter lost it, someone found it
      // If isLostItem is true: User found your lost item
      // If isLostItem is false (found): Owner claim this item

      const subject = isLostItem
        ? `User found your lost item: ${item.title}`
        : `Owner claim this item: ${item.title}`;

      const message = `
        Hello,

        A new claim has been submitted for your item: "${item.title}".

        Claimant Details:
        Name: ${claimantName}
        Contact: ${claimantContact}
        
        Proof/Description provided:
        ${proofAnswer}

        Please log in to your dashboard to view full details and approve/reject this claim.

        Regards,
        Campus Find Team
        `;

      try {
        await sendEmail({
          email: item.postedBy,
          subject: subject,
          message: message
        });
        console.log("Email sent successfully to", item.postedBy);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails, just log it
      }
    }

    res.json({ message: "Claim submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET USER STATS
exports.getUserStats = async (req, res) => {
  try {
    const { email } = req.params;

    const lostCount = await Item.countDocuments({ postedBy: email, category: "lost" });
    const foundCount = await Item.countDocuments({ postedBy: email, category: "found" });

    // For simplicity, defining "claimed" as items posted by user that are marked claimed
    // or items where the user has a claim (though model is simple now)
    const claimedCount = await Item.countDocuments({ postedBy: email, isClaimed: true });

    res.json({
      lostCount,
      foundCount,
      claimedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET USER ACTIVITY (Reported & Claimed)
exports.getUserActivity = async (req, res) => {
  try {
    const { email } = req.params;

    // 1. Items reported by user
    const reportedItems = await Item.find({ postedBy: email }).sort({ createdAt: -1 });

    // 2. Items claimed by user
    const claimedItems = await Item.find({ "claims.claimantContact": email }).sort({ createdAt: -1 });

    // 3. Normalize and Combine
    const activity = [];

    reportedItems.forEach(item => {
      activity.push({
        _id: item._id,
        type: 'reported',
        title: item.title,
        status: item.isClaimed ? 'Resolved' : 'Open',
        date: item.createdAt,
        category: item.category
      });
    });

    claimedItems.forEach(item => {
      // Find the specific claim by this user to get status/date
      const myClaim = item.claims.find(c => c.claimantContact === email);
      if (myClaim) {
        activity.push({
          _id: item._id,
          type: 'claimed',
          title: item.title,
          status: myClaim.status, // pending, approved, rejected
          date: myClaim.createdAt || item.createdAt,
          category: item.category
        });
      }
    });

    // 4. Sort by Date (Newest First)
    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 5. Limit to recent 10
    res.json(activity.slice(0, 10));

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
