const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore();

// Helper function to compute priority rank
function getMatchPriority(query, foodItem, vendorDetails, categoryDetails) {
  const q = query.toLowerCase();

  if (foodItem.name.toLowerCase().includes(q)) return 1;
  if (foodItem.description?.toLowerCase().includes(q)) return 2;
  if (categoryDetails.categoryName?.toLowerCase().includes(q)) return 3;
  if (vendorDetails.stallName?.toLowerCase().includes(q)) return 4;
  if (vendorDetails.stallDescription?.toLowerCase().includes(q)) return 5;
  if (vendorDetails.landMark?.toLowerCase().includes(q)) return 6;

  return null;
}

router.get("/", async (req, res) => {
  try {
    const query = req.query.q?.trim().toLowerCase();
    if (!query) return res.status(400).json({error: "Query parameter 'q' is required"});

    const realtimeDB = admin.database();

    // Step 1: Get vendors with vendorStatus = true
    const vendorStatusSnap = await realtimeDB.ref("vendorStatus").once("value");
    const activeVendors = [];
    vendorStatusSnap.forEach((snap) => {
      if (snap.val() === true) activeVendors.push(snap.key);
    });

    const matchedItems = [];

    for (const uid of activeVendors) {
      // Fetch vendor's basic details from Firestore
      const vendorDoc = await db.collection("users").doc(uid).get();
      const vendorDetails = vendorDoc.exists ? vendorDoc.data() : {};

      const categoriesSnap = await db.collection("users").doc(uid).collection("myMenu").get();
      for (const catDoc of categoriesSnap.docs) {
        const cid = catDoc.id;
        const categoryDetails = catDoc.data();

        // Check if category is visible
        const categoryStatusSnap = await realtimeDB.ref(`categoryStatus/${uid}/${cid}`).once("value");
        if (categoryStatusSnap.val() !== true) continue;

        // Fetch food item references
        const itemRefs = await db.collection("users").doc(uid).collection("myMenu").doc(cid).collection("categoryItems").get();
        for (const refDoc of itemRefs.docs) {
          const foodItemId = refDoc.data().foodItemId;
          const foodItemDoc = await db.collection("foodItems").doc(foodItemId).get();
          if (!foodItemDoc.exists) continue;

          const foodItem = foodItemDoc.data();
          const priority = getMatchPriority(query, foodItem, vendorDetails, categoryDetails);
          if (priority !== null) {
            matchedItems.push({id: foodItemId, priority});
          }
        }
      }
    }

    // Sort based on priority (lower is better)
    matchedItems.sort((a, b) => a.priority - b.priority);

    const foodItemIds = matchedItems.map((item) => item.id);

    res.json({results: foodItemIds});
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({error: "Search failed"});
  }
});

module.exports = router;
