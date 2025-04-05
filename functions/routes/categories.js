/* eslint-disable new-cap */
/* eslint-disable max-len */
const express = require("express");
const axios = require("axios");
const router = express.Router();
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const admin = require("firebase-admin"); // Add this to access the Realtime Database
const db = getFirestore();

// API
const API = process.env.API_URL;

// Reference to the Realtime Database
const realtimeDB = admin.database();

// Fetch paginated categories
router.get("/:uid", async (req, res) => {
  try {
    const {uid} = req.params;
    const {lastDoc} = req.query;
    const limit = parseInt(req.query.limit) || 10;

    let query = db.collection("users").doc(uid).collection("myMenu").orderBy("createdAt", "desc").limit(limit+1);
    if (lastDoc) {
      const lastDocSnapshot = await db.collection("users").doc(uid).collection("myMenu").doc(lastDoc).get();
      query = query.startAfter(lastDocSnapshot);
    }

    const categoriesSnapshot = await query.get();
    const categories = categoriesSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    res.json({
      categories,
      lastDoc: categoriesSnapshot.docs.length ? categoriesSnapshot.docs[categoriesSnapshot.docs.length - 1].id : null,
      hasMore: categoriesSnapshot.docs.length >= limit,
    });
  } catch (error) {
    res.status(500).json({error: "Failed to fetch categories"});
  }
});

// Fetches details of a single category
router.get("/:uid/:cid", async (req, res) => {
  try {
    const {uid, cid} = req.params;
    const categoryRef = db.collection("users").doc(uid).collection("myMenu").doc(cid);
    const categorySnapshot = await categoryRef.get();

    if (!categorySnapshot.exists) {
      return res.status(404).json({error: "Category not found"});
    }

    res.json({
      cid: categorySnapshot.id,
      ...categorySnapshot.data(),
    });
  } catch (error) {
    res.status(500).json({error: "Failed to fetch category details"});
  }
});

// Add a new category
router.post("/:uid/add", async (req, res) => {
  try {
    const {uid} = req.params;
    const {categoryName, visibility} = req.body;

    if (!categoryName) {
      return res.status(400).json({error: "Category name is required"});
    }

    // Create the category in Firestore
    const categoryRef = db.collection("users").doc(uid).collection("myMenu").doc();
    const categoryId = categoryRef.id;
    const category = {
      categoryName,
      visibility: visibility ?? true,
      createdAt: FieldValue.serverTimestamp(),
    };

    await categoryRef.set(category);

    // Determine vendor type based on category name
    const vendorType = categoryName.toLowerCase() === "stall" ? "stall" : "shop";

    // Add visibility status to original path
    const categoryStatusRef = realtimeDB.ref(`categoryStatus/${uid}/${categoryId}`);
    await categoryStatusRef.set(visibility ?? true);

    // Add simple key-value pair to vendorType
    const vendorTypeRef = realtimeDB.ref(`vendorType/${uid}`);
    await vendorTypeRef.set(vendorType);

    res.status(201).json({id: categoryId, ...category, vendorType});
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({error: "Failed to create category"});
  }
});

// Update a category
router.put("/:uid/update/:cid", async (req, res) => {
  try {
    const {uid, cid} = req.params;
    const {categoryName, visibility} = req.body;

    const updateData = {};
    if (categoryName) updateData.categoryName = categoryName;
    if (visibility !== undefined) updateData.visibility = visibility;

    // Update in Firestore
    await db.collection("users").doc(uid).collection("myMenu").doc(cid).update(updateData);

    // Update visibility in Realtime Database if provided
    if (visibility !== undefined) {
      const categoryStatusRef = realtimeDB.ref(`categoryStatus/${uid}/${cid}`);
      await categoryStatusRef.set(visibility);
    }

    res.json({message: "Category updated successfully"});
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({error: "Failed to update category"});
  }
});

// Deletes a category along with all food items in it
router.delete("/:uid/delete/:cid", async (req, res) => {
  try {
    const {uid, cid} = req.params;
    const categoryRef = db.collection("users").doc(uid).collection("myMenu").doc(cid);
    const categorySnapshot = await categoryRef.get();

    if (!categorySnapshot.exists) {
      return res.status(404).json({error: "Category not found"});
    }

    // Fetch all food items in this category
    const categoryItemsRef = categoryRef.collection("categoryItems");
    const categoryItemsSnapshot = await categoryItemsRef.get();

    // Delete all food items in the category
    await Promise.all(categoryItemsSnapshot.docs.map(async (doc) => {
      const foodItemId = doc.data().foodItemId;
      console.log(`${API}/seller/${uid}/item/${cid}/${foodItemId}`);
      await axios.delete(`${API}/seller/${uid}/item/${cid}/${foodItemId}`);
    }));

    // Delete the category itself from Firestore
    await categoryRef.delete();

    // Remove the category visibility status from Realtime Database
    const categoryStatusRef = realtimeDB.ref(`categoryStatus/${uid}/${cid}`);
    await categoryStatusRef.remove();

    res.json({message: "Category and its food items deleted successfully"});
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({error: "Failed to delete category"});
  }
});

// Add food item to a category
router.post("/:uid/items/:cid/add", async (req, res) => {
  try {
    const {uid, cid} = req.params;
    const {name, description, price, photoURLs} = req.body;

    if (!name || !price || !photoURLs || !Array.isArray(photoURLs) || photoURLs.length === 0) {
      return res.status(400).json({error: "Missing required fields"});
    }

    const foodItemRef = db.collection("foodItems").doc();
    const foodItem = {
      seller: uid,
      name,
      description: description || "",
      price,
      photoURLs,
      rating: 0,
      createdAt: FieldValue.serverTimestamp(),
    };
    await foodItemRef.set(foodItem);

    await db.collection("users").doc(uid).collection("myMenu").doc(cid).collection("categoryItems").doc(foodItemRef.id).set({
      foodItemId: foodItemRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({fid: foodItemRef.id, ...foodItem});
  } catch (error) {
    res.status(500).json({error: "Failed to add food item to category"});
  }
});

// Fetch paginated food items of a category
router.get("/:uid/:cid/items", async (req, res) => {
  try {
    const {uid, cid} = req.params;
    const {limit = 10, lastDocId} = req.query;

    let query = db.collection("users")
        .doc(uid)
        .collection("myMenu")
        .doc(cid)
        .collection("categoryItems")
        .orderBy("foodItemId")
        .limit(Number(limit));

    if (lastDocId) {
      const lastDoc = await db.collection("foodItems").doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({items: [], hasMore: false});
    }

    const foodItemIds = snapshot.docs.map((doc) => doc.data().foodItemId);
    const foodItemsPromises = foodItemIds.map((id) => db.collection("foodItems").doc(id).get());
    const foodItemsDocs = await Promise.all(foodItemsPromises);
    const foodItems = foodItemsDocs.map((doc) => ({id: doc.id, ...doc.data()}));

    res.json({items: foodItems, hasMore: snapshot.docs.length === Number(limit)});
  } catch (error) {
    res.status(500).json({error: "Failed to fetch category items"});
  }
});

module.exports = router;
