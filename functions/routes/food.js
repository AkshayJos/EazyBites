/* eslint-disable no-prototype-builtins */
/* eslint-disable max-len */
/* eslint-disable new-cap */
const express = require("express");
const router = express.Router();
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore();

// Fetches paginated food items
router.get("/foodItems", async (req, res) => {
  try {
    // Get limit parameter with default value of 10
    const limit = parseInt(req.query.limit) || 10;

    // Get page token for pagination (optional)
    const lastId = req.query.lastId || null;

    // Query to get one more item than requested to determine if there are more items
    let query = db.collection("foodItems")
        .orderBy("rating", "desc")
        .limit(limit + 1); // Request one extra item to check if there's more

    // If lastId is provided, use it as a cursor for pagination
    if (lastId) {
      const lastDocSnapshot = await db.collection("foodItems").doc(lastId).get();
      if (!lastDocSnapshot.exists) {
        return res.status(400).json({error: "Invalid lastId provided"});
      }

      query = query.startAfter(lastDocSnapshot);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json({
        foodItems: [],
        hasMore: false,
        count: 0,
      });
    }

    // Check if we have more results than requested limit
    const hasMore = snapshot.docs.length > limit;

    // If we have more items than the limit, remove the extra one
    const docsToReturn = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Extract food item IDs
    const foodItems = docsToReturn.map((doc) => doc.id);

    // Get the last ID for next pagination request
    const lastVisibleId = docsToReturn[docsToReturn.length - 1].id;

    res.status(200).json({
      foodItems,
      lastId: lastVisibleId,
      hasMore: hasMore,
      count: foodItems.length,
    });
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({error: "Failed to fetch food items"});
  }
});

// Fetches details of a single food item (foodie's view)
router.get("/foodItem/:fid", async (req, res) => {
  try {
    const fid = req.params.fid;

    // Check if fid exists
    const foodItemDoc = await db.collection("foodItems").doc(fid).get();

    if (!foodItemDoc.exists) {
      return res.status(404).json({error: "Food item not found"});
    }

    // Get food item data
    const foodItemData = foodItemDoc.data();

    // Get seller information using seller id
    const sid = foodItemData.seller;

    // Check if sid exists
    if (!sid) {
      return res.status(400).json({error: "Food item has no associated seller"});
    }

    // Fetch seller info from users collection
    const sellerDoc = await db.collection("users").doc(sid).get();

    if (!sellerDoc.exists) {
      return res.status(404).json({error: "Seller not found"});
    }

    const sellerData = sellerDoc.data();

    // Add stallName to food item data
    const responseData = {
      ...foodItemData,
      id: fid,
      stallName: sellerData.stallName || "Unknown Stall",
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching food item details:", error);
    res.status(500).json({error: "Failed to fetch food item details"});
  }
});

module.exports = router;
