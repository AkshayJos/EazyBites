/* eslint-disable no-prototype-builtins */
/* eslint-disable max-len */
/* eslint-disable new-cap */
const express = require("express");
const router = express.Router();
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const db = getFirestore();

// Fetches paginated menu items for a specific seller
router.get("/:uid", async (req, res) => {
  try {
    const {uid} = req.params;
    const {lastDoc} = req.query;
    const limit = parseInt(req.query.limit) || 10;

    // Reference to seller's menu subcollection
    const menuRef = db.collection("users").doc(uid).collection("myMenu");

    // Build query with pagination
    let query = menuRef.orderBy("createdAt", "desc").limit(limit);
    if (lastDoc) {
      const lastDocSnapshot = await menuRef.doc(lastDoc).get();
      query = query.startAfter(lastDocSnapshot);
    }

    // Get menu item IDs
    const menuSnapshot = await query.get();
    const menuIds = menuSnapshot.docs.map((doc) => doc.data().foodItemId);

    if (menuIds.length === 0) {
      return res.json({
        items: [],
        lastDoc: null,
        hasMore: false,
      });
    }

    // Fetch corresponding food items
    const foodItemsRef = db.collection("foodItems");
    const foodItems = await Promise.all(
        menuIds.map(async (id) => {
          const doc = await foodItemsRef.doc(id).get();
          return {
            fid: doc.id,
            name: doc.data().name,
            price: doc.data().price,
            photoURL: doc.data().photoURLs[0],
            rating: doc.data().rating,
          };
        }),
    );

    res.json({
      items: foodItems,
      lastDoc: menuSnapshot.docs[menuSnapshot.docs.length - 1].id,
      hasMore: menuSnapshot.docs.length === limit,
    });
  } catch (error) {
    res.status(500).json({error: "Failed to fetch menu items"});
  }
});

// Fetches details of a single food item
router.get("/:uid/item/:fid", async (req, res) => {
  try {
    const {uid, fid} = req.params;

    // Verify the item belongs to the seller
    const menuItemRef = await db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .where("foodItemId", "==", fid)
        .get();

    if (menuItemRef.empty) {
      return res.status(404).json({error: "Item not found in seller's menu"});
    }

    // Fetch food item details
    const foodItemDoc = await db.collection("foodItems").doc(fid).get();

    if (!foodItemDoc.exists) {
      return res.status(404).json({error: "Food item not found"});
    }

    const foodItem = {
      fid: foodItemDoc.id,
      ...foodItemDoc.data(),
    };

    res.json(foodItem);
  } catch (error) {
    res.status(500).json({error: "Failed to fetch food item details"});
  }
});

// Creates a new food item and adds it to seller's menu
router.post("/:uid/add", async (req, res) => {
  try {
    const {uid} = req.params;
    const {name, description, price, photoURLs} = req.body;

    // Validate required fields
    if (!name || !price || !photoURLs || !Array.isArray(photoURLs) || photoURLs.length === 0) {
      return res.status(400).json({error: "Missing required fields"});
    }

    // Create new food item
    const foodItemRef = db.collection("foodItems").doc();
    const foodItem = {
      name,
      description: description || "",
      price,
      photoURLs,
      rating: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    await foodItemRef.set(foodItem);

    // Add reference to seller's menu
    await db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .doc()
        .set({
          foodItemId: foodItemRef.id,
          createdAt: FieldValue.serverTimestamp(),
        });

    res.status(201).json({
      fid: foodItemRef.id,
      ...foodItem,
    });
  } catch (error) {
    res.status(500).json({error: "Failed to create food item"});
  }
});

// Updates an existing food item
router.put("/:uid/update/:fid", async (req, res) => {
  try {
    const {uid, fid} = req.params;
    const {name, description, price, photoURLs} = req.body;

    // Verify the item belongs to the seller
    const menuItemRef = await db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .where("foodItemId", "==", fid)
        .get();

    if (menuItemRef.empty) {
      return res.status(404).json({error: "Item not found in seller's menu"});
    }

    // Update food item
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = price;
    if (photoURLs && Array.isArray(photoURLs) && photoURLs.length > 0) {
      updateData.photoURLs = photoURLs;
    }

    await db.collection("foodItems")
        .doc(fid)
        .update(updateData);

    res.json({message: "Food item updated successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to update food item"});
  }
});

module.exports = router;
