const Item = require("../models/Item");
const sendEmail = require("../utils/sendEmail");

const Notification = require("../models/Notification");
const User = require("../models/User");

// 🔥 GET SUCCESS STORIES (Resolved Items)
exports.successStories = async (req, res) => {
  console.log("DEBUG: Hit successStories endpoint");
  try {
    const items = await Item.find({ isClaimed: true }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

      // --- 1. Notify the EXISTING user (match.postedBy) ---
      const hasExistingNotif = await Notification.findOne({
        userId: match.postedBy,
        relatedItemId: newItem._id,
        type: "match_found"
      });

      if (!hasExistingNotif) {
        const msgForExisting = match.category === "lost"
          ? `Potential Match Found: Someone found an item that might be your lost "${match.title}"!`
          : `Potential Match Found: Someone already lost an item similar to the one you found: "${newItem.title}"`;

        await Notification.create({
          userId: match.postedBy,
          message: msgForExisting,
          type: "match_found",
          relatedItemId: newItem._id
        });

        // Email to existing user
        const recipientExisting = await User.findOne({ email: match.postedBy });
        const nameExisting = recipientExisting?.fullName?.split(' ')[0] || "Member";

        await sendEmail({
          email: match.postedBy,
          subject: "Potential Match Found!",
          message: `Hello ${nameExisting},\n\n${msgForExisting}\n\nPlease check your dashboard for details.\n\nRegards,\nCampus Connect Team`
        }).catch(err => console.error("Email failed for existing reporter", err));

        notificationsCreated++;
      }

      // --- 2. Notify the NEW user (newItem.postedBy) ---
      const hasNewNotif = await Notification.findOne({
        userId: newItem.postedBy,
        relatedItemId: match._id,
        type: "match_found"
      });

      if (!hasNewNotif) {
        const msgForNew = newItem.category === "lost"
          ? `Potential Match Found: Someone already found an item that might be your lost "${newItem.title}"!`
          : `Potential Match Found: Someone already lost an item similar to what you just found: "${match.title}"`;

        await Notification.create({
          userId: newItem.postedBy,
          message: msgForNew,
          type: "match_found",
          relatedItemId: match._id
        });

        // Email to new user
        const recipientNew = await User.findOne({ email: newItem.postedBy });
        const nameNew = recipientNew?.fullName?.split(' ')[0] || "Member";

        await sendEmail({
          email: newItem.postedBy,
          subject: "Potential Match Found!",
          message: `Hello ${nameNew},\n\n${msgForNew}\n\nPlease check your dashboard for details.\n\nRegards,\nCampus Connect Team`
        }).catch(err => console.error("Email failed for new reporter", err));

        notificationsCreated++;
      }
    }
  }
  return notificationsCreated;
};

// 🔥 CREATE ITEM
exports.createItem = async (req, res) => {
  try {
    console.log("Creating item with body:", req.body);
    const newItem = new Item({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      itemCategory: req.body.itemCategory || "Others",
      location: req.body.location,
      contactInfo: req.body.contactInfo,
      date: req.body.date,
      itemImage: req.file ? req.file.path : "",
      postedBy: req.body.postedBy || "",
    });

    await newItem.save();
    console.log("Saved item:", newItem);

    // Trigger Smart Matching (Background - Fire & Forget)
    checkAndNotifyMatches(newItem).catch(err => console.error("Background matching error:", err));

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

// 🔥 GET ALL ITEMS (Open only)
exports.getItems = async (req, res) => {
  try {
    const items = await Item.find({ isClaimed: false }).sort({ createdAt: -1 });
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

    // 📧 SEND EMAIL NOTIFICATION (Background - Fire & Forget)
    if (item.postedBy && item.postedBy.includes("@")) {
      (async () => {
        try {
          const isLostItem = item.category === "lost";
          const recipient = await User.findOne({ email: item.postedBy });
          const firstName = recipient?.fullName?.split(' ')[0] || "Member";

          const subject = isLostItem
            ? `Found Alert: Someone might have found your item: ${item.title}`
            : `Claim Alert: A member has claimed your item: ${item.title}`;

          const message = `
Hello ${firstName},

A new claim or match has been submitted for your item: "${item.title}".

Claimant Details:
Name: ${claimantName}
Contact: ${claimantContact}

Proof/Description provided:
${proofAnswer}

Please log in to your dashboard to view full details and manage this request.

Regards,
Campus Connect Team
`;

          await sendEmail({
            email: item.postedBy,
            subject: subject,
            message: message
          });
          console.log("Email sent successfully to", item.postedBy);

          // 🔔 DB NOTIFICATION
          await Notification.create({
            userId: item.postedBy,
            message: isLostItem
              ? `Update: Someone might have found your lost item: "${item.title}"`
              : `Update: A member has claimed your found item: "${item.title}"`,
            type: "claim_update",
            relatedItemId: item._id
          });
          console.log("Dashboard notification created for", item.postedBy);

        } catch (bgError) {
          console.error("Background notification error:", bgError);
        }
      })();
    }

    res.json({ message: "Claim submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 MARK AS RESOLVED
exports.resolveItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { isClaimed: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item marked as resolved", item });
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
