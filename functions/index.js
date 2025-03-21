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
const foodRoutes = require("./routes/food");
const orderRoutes = require("./routes/orders");

// Use routes
app.use("/users", userRoutes);
app.use("/seller", sellerMenuRoutes);
app.use("/food", foodRoutes);
app.use("/orders", orderRoutes);

// Export API
exports.api = onRequest(app);
