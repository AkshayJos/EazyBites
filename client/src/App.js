// src/App.js
import React from "react";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import FoodSeller from "./pages/FoodSeller/FoodSeller";
import Foodie from "./pages/Foodie/Foodie";
import EditProfileFoodie from "./pages/Foodie/EditProfile";
import EditProfileSeller from "./pages/FoodSeller/EditProfile";

function App() {
  return (
    <>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/food-seller" element={<FoodSeller />} />
          <Route path="/foodie" element={<Foodie />} />
          <Route path="/foodie-edit-profile" element={<EditProfileFoodie />} />
          <Route path="/seller-edit-profile" element={<EditProfileSeller />} />
        </Routes>
        <Footer />
      </Router>
    </>
  );
}

export default App;
