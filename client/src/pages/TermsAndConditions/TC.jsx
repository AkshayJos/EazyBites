import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./TC.css";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== "default") {
      navigate(-1); // Go back if navigated from another page
    } else {
      navigate("/"); // Go to home if opened directly in a new tab
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="TC-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="TC-content" variants={itemVariants}>
        <motion.h1 
          className="TC-heading"
          variants={itemVariants}
        >
          Terms and Conditions
        </motion.h1>
        
        <motion.div 
          className="TC-terms-box"
          variants={itemVariants}
          whileHover={{ boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" }}
        >
          <p className="TC-paragraph">
            Welcome to EazyBites! Before using our platform, please read the terms carefully.
          </p>
          <h3 className="TC-subheading">1. Introduction</h3>
          <p className="TC-paragraph">These Terms govern your use of EazyBites, an online food ordering service.</p>
          <h3 className="TC-subheading">2. User Responsibilities</h3>
          <p className="TC-paragraph">Users must provide accurate information and comply with platform rules.</p>
          <h3 className="TC-subheading">3. Ordering and Payment</h3>
          <p className="TC-paragraph">Orders are subject to availability. Payments must be made at pickup.</p>
          <h3 className="TC-subheading">4. Privacy & Security</h3>
          <p className="TC-paragraph">We use Firebase for authentication and data security.</p>
          <h3 className="TC-subheading">5. Liability</h3>
          <p className="TC-paragraph">We are not responsible for food quality or delays.</p>
          <h3 className="TC-subheading">6. Changes to Terms</h3>
          <p className="TC-paragraph">We reserve the right to update these terms at any time.</p>
        </motion.div>
        
        <motion.button 
          id="TC-back-btn" 
          onClick={handleBack} 
          className="TC-button"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {location.key !== "default" ? "Go Back" : "Go To Home"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default TermsAndConditions;