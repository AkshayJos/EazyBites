import React, { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import Card from "../../components/FoodItemCard/Card";
import { motion } from "framer-motion";
import "./Menu.css";

const Menu = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stallStatusRef = ref(database, "stallStatus");

    const fetchFoodItems = async (sellerId) => {
      const myMenuRef = collection(db, `users/${sellerId}/myMenu`);
      const myMenuSnapshot = await getDocs(myMenuRef);

      const items = await Promise.all(
        myMenuSnapshot.docs.map(async (menuDoc) => {
          const foodItemId = menuDoc.data().foodItemId;
          const foodItemRef = doc(db, "foodItems", foodItemId);
          const foodItemSnap = await getDoc(foodItemRef);
          return foodItemSnap.exists() ? { id: foodItemId, ...foodItemSnap.data() } : null;
        })
      );
      return items.filter((item) => item !== null);
    };

    const handleStallStatusUpdate = async (snapshot) => {
      setLoading(true);
      const stalls = snapshot.val();
      
      if (!stalls) {
        setFoodItems([]);
        setLoading(false);
        return;
      }

      const liveSellers = Object.entries(stalls)
        .filter(([_, isLive]) => isLive)
        .map(([sellerId]) => sellerId);

      const allFoodItems = [];
      for (const sellerId of liveSellers) {
        const sellerFoodItems = await fetchFoodItems(sellerId);
        allFoodItems.push(...sellerFoodItems);
      }

      setFoodItems(allFoodItems);
      setLoading(false);
    };

    onValue(stallStatusRef, handleStallStatusUpdate);

    return () => off(stallStatusRef, "value", handleStallStatusUpdate);
  }, []);

  // Loading animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const dotVariants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -15, 0],
      transition: {
        repeat: Infinity,
        duration: 1
      }
    }
  };

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>
      <div className="Menu-grid">
        {loading ? (
          <motion.div 
            className="Menu-loading"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="loading-text">Discovering what's cooking</div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
            </div>
          </motion.div>
        ) : foodItems.length > 0 ? (
          foodItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card fid={item.id} />
            </motion.div>
          ))
        ) : (
          <motion.p 
            className="Menu-no-items"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Stalls are closed currently.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Menu;