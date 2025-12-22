const Item = require("../models/item");

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
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    });

    await item.save();
    res.json({ message: "Claim submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
