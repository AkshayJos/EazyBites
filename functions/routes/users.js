/* eslint-disable no-prototype-builtins */
/* eslint-disable max-len */
/* eslint-disable new-cap */
const express = require("express");
const router = express.Router();
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore();

// Verify UID exists in database
const verifyUid = async (uid) => {
  const userDoc = await db.collection("users").doc(uid).get();
  return userDoc.exists;
};

// Check if email or phone number already exists
const checkUniqueFields = async (fields, currentUid) => {
  const errors = [];
  const queries = [];

  // Only check fields that are actually being updated
  const fieldsToCheck = {
    email: fields.hasOwnProperty("email"),
    phoneNumber: fields.hasOwnProperty("phoneNumber"),
  };

  if (fieldsToCheck.email) {
    queries.push({
      field: "email",
      query: db.collection("users")
          .where("email", "==", fields.email)
          .get(),
    });
  }

  if (fieldsToCheck.phoneNumber) {
    queries.push({
      field: "phoneNumber",
      query: db.collection("users")
          .where("phoneNumber", "==", fields.phoneNumber)
          .get(),
    });
  }

  if (queries.length === 0) {
    return null;
  }

  // Execute all queries in parallel
  const results = await Promise.all(queries.map((q) => q.query));

  for (let i = 0; i < results.length; i++) {
    const querySnapshot = results[i];
    const field = queries[i].field;

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      if (existingDoc.id !== currentUid) {
        errors.push(`${field === "email" ? "Email" : "Phone number"} already exists`);
      }
    }
  }

  return errors.length > 0 ? errors : null;
};

// Check change counters for email and phone
const validateChangeLimit = async (userDoc, updates) => {
  const userData = userDoc.data();
  const counters = userData.changeCounters || {
    email: 0,
    phoneNumber: 0,
  };

  const errors = [];

  if (updates.hasOwnProperty("email") && updates.email !== userData.email) {
    if (counters.email >= 1) {
      errors.push("Email can only be changed once");
    }
  }

  if (updates.hasOwnProperty("phoneNumber") && updates.phoneNumber !== userData.phoneNumber) {
    if (counters.phoneNumber >= 1) {
      errors.push("Phone number can only be changed once");
    }
  }

  return errors.length > 0 ? errors : null;
};

// Update change counters
const incrementChangeCounters = (userData, updates) => {
  const counters = userData.changeCounters || {
    email: 0,
    phoneNumber: 0,
  };

  if (updates.hasOwnProperty("email") && updates.email !== userData.email) {
    counters.email += 1;
  }

  if (updates.hasOwnProperty("phoneNumber") && updates.phoneNumber !== userData.phoneNumber) {
    counters.phoneNumber += 1;
  }

  return counters;
};

// Fetch user details by userId
router.get("/:uid", async (req, res) => {
  try {
    const {uid} = req.params;

    // Verify UID exists
    if (!(await verifyUid(uid))) {
      return res.status(404).json({error: "User not found"});
    }

    const userDoc = await db.collection("users").doc(uid).get();
    return res.json({id: userDoc.id, ...userDoc.data()});
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({error: "Internal Server Error"});
  }
});

// Update user fields by userId
router.patch("/:uid", async (req, res) => {
  try {
    const {uid} = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({error: "No update data provided"});
    }

    // Verify UID exists
    if (!(await verifyUid(uid))) {
      return res.status(404).json({error: "User not found"});
    }

    // Get user document
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    // Check for unique constraint violations
    const uniqueErrors = await checkUniqueFields(updates, uid);
    if (uniqueErrors) {
      return res.status(409).json({errors: uniqueErrors});
    }

    // Check change limits
    const limitErrors = await validateChangeLimit(userDoc, updates);
    if (limitErrors) {
      return res.status(400).json({errors: limitErrors});
    }

    // Update change counters and add to updates
    const updatedCounters = incrementChangeCounters(userDoc.data(), updates);

    // Perform the update
    await userRef.update({
      ...updates,
      changeCounters: updatedCounters,
      updatedAt: new Date().toISOString(),
    });

    // Fetch and return the updated document
    const updatedDoc = await userRef.get();
    return res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
