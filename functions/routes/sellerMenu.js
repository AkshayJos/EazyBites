const express = require("express");
const router = express.Router();
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore();
const {getStorage} = require("firebase-admin/storage");
const admin = require("../config/admin");


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

// Fetches details of a single food item (seller's view)
router.get("/:uid/items/:cid/:fid", async (req, res) => {
  try {
    const {uid, cid, fid} = req.params;

    // Verify the item belongs to the seller
    const menuItemRef = await db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .doc(cid)
        .collection("categoryItems")
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

// Updates an existing food item
router.put("/:uid/update/:cid/:fid", async (req, res) => {
  try {
    const {uid, fid, cid} = req.params;
    const {name, description, price, photoURLs} = req.body;

    // Verify the item belongs to the seller
    const menuItemRef = await db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .doc(cid)
        .collection("categoryItems")
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


// Deletes a food item and removes its reference from categoryItems
router.delete("/:uid/item/:cid/:fid", async (req, res) => {
  try {
    const { uid, cid, fid } = req.params;

    const db = admin.firestore();

    // Reference to categoryItems subcollection where foodItemId matches fid
    const categoryItemSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("myMenu")
      .doc(cid)
      .collection("categoryItems")
      .where("foodItemId", "==", fid)
      .get();

    if (categoryItemSnapshot.empty) {
      return res.status(404).json({ error: "Item not found in categoryItems" });
    }

    // Fetch food item document
    const foodItemRef = db.collection("foodItems").doc(fid);
    const foodItemDoc = await foodItemRef.get();

    if (!foodItemDoc.exists) {
      return res.status(404).json({ error: "Food item not found" });
    }

    // Delete food item document
    await foodItemRef.delete();

    // Delete all matched categoryItems
    await Promise.all(categoryItemSnapshot.docs.map(doc => doc.ref.delete()));

    res.json({ message: "✅ Food item and related references deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting food item:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
