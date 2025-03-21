/* eslint-disable new-cap */
/* eslint-disable max-len */
const express = require("express");
const router = express.Router();
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore();

// Add Rating to an order
router.post("/rate/:uid/:orderId", async (req, res) => {
  try {
    const {uid, orderId} = req.params;
    const {rating, fid, userOrderId} = req.body;

    // Validate input
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({error: "Invalid rating. Must be a number between 1 and 5."});
    }

    if (!fid) {
      return res.status(400).json({error: "Food item ID (fid) is required."});
    }

    // Update the order's rating in the orders collection
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({error: "Order not found."});
    }

    await orderRef.update({
      rating: rating,
      ratedAt: Date.now(),
    });

    // Update the food item's rating in the foodItems collection
    const foodItemRef = db.collection("foodItems").doc(fid);
    const foodItemSnap = await foodItemRef.get();

    if (foodItemSnap.exists) {
      const foodItemData = foodItemSnap.data();
      const currentRating = foodItemData.rating || 0;
      const totalRatings = foodItemData.totalRatings || 0;

      // Calculate new rating
      const newTotalRatings = totalRatings + 1;
      const newRating = ((currentRating * totalRatings) + rating) / newTotalRatings;

      await foodItemRef.update({
        rating: newRating,
        totalRatings: newTotalRatings,
      });
    }

    // If user order exists, update it as well
    if (userOrderId) {
      const userOrderRef = db.collection("users").doc(uid).collection("orders").doc(userOrderId);
      const userOrderSnap = await userOrderRef.get();

      if (userOrderSnap.exists) {
        await userOrderRef.update({
          rating: rating,
          ratedAt: Date.now(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Rating submitted successfully.",
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({error: "Internal server error."});
  }
});

// Fetches paginated past orders
router.get("/history/:uid", async (req, res) => {
  try {
    const {uid} = req.params;
    const {lastOrderId} = req.query;
    const pageSize = 10; // Number of orders per page

    // Reference to user's orders subcollection
    let userOrdersRef = db.collection("users").doc(uid).collection("orders")
        .where("status", "in", ["completed", "cancelled"])
        .orderBy("timestamp", "desc");

    if (lastOrderId) {
      const lastOrderSnap = await db.collection("users").doc(uid).collection("orders").doc(lastOrderId).get();
      if (lastOrderSnap.exists) {
        userOrdersRef = userOrdersRef.startAfter(lastOrderSnap);
      }
    }

    const userOrdersSnap = await userOrdersRef.limit(pageSize + 1).get(); // Fetch one extra to check hasMore
    if (userOrdersSnap.empty) {
      return res.json({orders: {}, hasMore: false, lastOrderId: null});
    }

    const orders = {};
    let lastDocId = null;
    const fetchedDocs = userOrdersSnap.docs.slice(0, pageSize); // Take only pageSize items

    for (const doc of fetchedDocs) {
      const orderData = doc.data();
      lastDocId = orderData.orderId;

      // Fetch actual order from orders collection
      const orderSnap = await db.collection("orders").doc(orderData.orderId).get();
      if (!orderSnap.exists) continue;

      const order = orderSnap.data();

      // Fetch food item details
      const foodSnap = await db.collection("foodItems").doc(order.fid).get();
      const foodData = foodSnap.exists ? foodSnap.data() : {};

      // Fetch stall name
      const stallSnap = await db.collection("users").doc(order.sid).get();
      const stallData = stallSnap.exists ? stallSnap.data() : {};

      // Construct response order object
      orders[orderData.orderId] = {
        photoURL: foodData.photoURLs ? foodData.photoURLs.slice(0, 2) : [],
        stallName: stallData.stallName || "Unknown",
        price: order.totalCost,
        status: order.status,
        foodItem: foodData.name || "Unknown",
        quantity: order.quantity,
        orderTime: order.timestamp,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        fid: order.fid,
        rating: order.rating,
      };
    }

    const hasMore = userOrdersSnap.docs.length > pageSize;
    res.json({orders, hasMore, lastOrderId: lastDocId});
  } catch (error) {
    console.error("Error fetching past orders:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

module.exports = router;
