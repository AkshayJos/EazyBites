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
    // Renamed from stallStatusRef to vendorStatusRef
    const vendorStatusRef = ref(database, "vendorStatus");

    const fetchCategoryItems = async (vendorId, categoryId) => {
      try {
        // Navigate to the specific category's items collection
        const categoryItemsRef = collection(
          db, 
          `users/${vendorId}/myMenu/${categoryId}/categoryItems`
        );
        const categoryItemsSnapshot = await getDocs(categoryItemsRef);
        
        // Map through the food items in this category
        return categoryItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          vendorId: vendorId,
          categoryId: categoryId,
        }));
      } catch (error) {
        console.error(`Error fetching category items for vendor ${vendorId}, category ${categoryId}:`, error);
        return [];
      }
    };

    const fetchVendorCategories = async (vendorId) => {
      try {
        // Get all categories for this vendor
        const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        return categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error(`Error fetching categories for vendor ${vendorId}:`, error);
        return [];
      }
    };

    const handleVendorStatusUpdate = async (snapshot) => {
      setLoading(true);
      const vendors = snapshot.val();
      
      if (!vendors) {
        setFoodItems([]);
        setLoading(false);
        return;
      }

      // Get all live vendors
      const liveVendors = Object.entries(vendors)
        .filter(([_, isLive]) => isLive)
        .map(([vendorId]) => vendorId);

      // For each live vendor, check the categories
      const allFoodItems = [];
      for (const vendorId of liveVendors) {
        // Check categoryStatus in realtime database
        const categoryStatusRef = ref(database, `categoryStatus/${vendorId}`);
        
        try {
          // Get snapshot of category status
          const categoryStatusSnapshot = await new Promise((resolve, reject) => {
            onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
          });
          
          const categoryStatus = categoryStatusSnapshot.val();
          
          if (!categoryStatus) continue;
          
          // Get all categories for this vendor
          const vendorCategories = await fetchVendorCategories(vendorId);
          
          // For each active category, fetch its items
          for (const category of vendorCategories) {
            // Check if category is active in RTD
            if (categoryStatus[category.id] === true) {
              const categoryItems = await fetchCategoryItems(vendorId, category.id);
              allFoodItems.push(...categoryItems);
            }
          }
        } catch (error) {
          console.error(`Error processing vendor ${vendorId}:`, error);
        }
      }

      setFoodItems(allFoodItems);
      setLoading(false);
    };

    onValue(vendorStatusRef, handleVendorStatusUpdate);

    return () => {
      // Clean up listeners when component unmounts
      off(vendorStatusRef);
    };
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
              key={`${item.vendorId}-${item.categoryId}-${item.id}`}
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
            No vendors are open currently.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Menu;