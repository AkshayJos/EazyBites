/* eslint-disable max-len */
const {initializeApp} = require("firebase-admin/app");
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

initializeApp();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// import routes
const userRoutes = require("./routes/users");
const sellerMenuRoutes = require("./routes/sellerMenu");

// Use routes
app.use("/users", userRoutes);
app.use("/seller", sellerMenuRoutes);

// Export API
exports.api = onRequest(app);
