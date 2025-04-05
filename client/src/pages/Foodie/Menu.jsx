import React, { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import Card from "../../components/FoodItemCard/Card";
import VendorCard from "./Vendor/VendorCard";
import CategoryCard from "./Category/CategoryCard";
import { motion } from "framer-motion";
import "./Menu.css";

const Menu = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("food"); // "food", "stalls", "shops", "categories"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorType, setVendorType] = useState(null); // "stall" or "shop"

  useEffect(() => {
    // Fetch food items function (your original code)
    const fetchFoodItems = () => {
      const vendorStatusRef = ref(database, "vendorStatus");

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
    };

    // Fetch vendor categories helper (reused from original code)
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

    // Fetch category items helper (reused from original code)
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

    // New function to fetch stalls or shops
    const fetchVendorsByType = async (type) => {
      setLoading(true);
      try {
        // Reference to vendorStatus in RTD to check live vendors
        const vendorStatusRef = ref(database, "vendorStatus");
        const vendorStatusSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorStatusRef, resolve, { onlyOnce: true }, reject);
        });
        
        const vendorStatus = vendorStatusSnapshot.val() || {};
        
        // Reference to vendorType in RTD to check vendor types
        const vendorTypeRef = ref(database, "vendorType");
        const vendorTypeSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
        });
        
        const vendorTypes = vendorTypeSnapshot.val() || {};
        
        // Filter vendors by type and live status
        const typeVendors = Object.entries(vendorTypes)
          .filter(([vendorId, vendorType]) => 
            vendorType.toLowerCase() === type.toLowerCase() && 
            vendorStatus[vendorId] === true
          )
          .map(([vendorId]) => vendorId);
        
        setVendors(typeVendors);
        setLoading(false);
      } catch (error) {
        console.error(`Error fetching ${type}s:`, error);
        setVendors([]);
        setLoading(false);
      }
    };

    // Load appropriate data based on active view
    if (activeView === "food") {
      fetchFoodItems();
    } else if (activeView === "stalls") {
      fetchVendorsByType("stall");
    } else if (activeView === "shops") {
      fetchVendorsByType("shop");
    } else if (activeView === "categories") {
      // This will be handled by the vendorClickHandler
      if (!selectedVendorId) {
        setActiveView("shops");
      }
    }

  }, [activeView, selectedVendorId]);

  // This code should be integrated into the handleVendorClick function in your Menu component
// It ensures that the vendorType is determined correctly when a vendor is clicked

const handleVendorClick = async (vendorId, vendorData) => {
  setSelectedVendorId(vendorId);
  setLoading(true);
  
  try {
    // Determine vendor type from RTD if not already set
    let currentVendorType = vendorType;
    if (!currentVendorType) {
      const vendorTypeRef = ref(database, `vendorType/${vendorId}`);
      const vendorTypeSnapshot = await new Promise((resolve, reject) => {
        onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
      });
      
      currentVendorType = vendorTypeSnapshot.val()?.toLowerCase() || "shop";
      setVendorType(currentVendorType);
    }
    
    if (currentVendorType === "stall") {
      // For stalls, directly show food items from the "Stall" category
      try {
        // Find the "Stall" category
        const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        const stallCategory = categoriesSnapshot.docs.find(doc => 
          doc.data().name?.toLowerCase() === "stall"
        );
        
        if (stallCategory) {
          // Check if this category is active in RTD
          const categoryStatusRef = ref(database, `categoryStatus/${vendorId}/${stallCategory.id}`);
          const categoryStatusSnapshot = await new Promise((resolve, reject) => {
            onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
          });
          
          const isCategoryActive = categoryStatusSnapshot.val() === true;
          
          if (isCategoryActive) {
            // Get items from this category
            const categoryItemsRef = collection(
              db, 
              `users/${vendorId}/myMenu/${stallCategory.id}/categoryItems`
            );
            const categoryItemsSnapshot = await getDocs(categoryItemsRef);
            
            const stallItems = categoryItemsSnapshot.docs.map(doc => ({
              id: doc.id,
              vendorId: vendorId,
              categoryId: stallCategory.id,
            }));
            
            setFoodItems(stallItems);
            setActiveView("food");
          } else {
            // Category is not active
            setFoodItems([]);
            setActiveView("food");
          }
        } else {
          // Get all active categories and their items
          const allItems = [];
          const categoryStatusRef = ref(database, `categoryStatus/${vendorId}`);
          const categoryStatusSnapshot = await new Promise((resolve, reject) => {
            onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
          });
          
          const categoryStatus = categoryStatusSnapshot.val() || {};
          
          for (const category of categoriesSnapshot.docs) {
            if (categoryStatus[category.id] === true) {
              const categoryItemsRef = collection(
                db, 
                `users/${vendorId}/myMenu/${category.id}/categoryItems`
              );
              const categoryItemsSnapshot = await getDocs(categoryItemsRef);
              
              const items = categoryItemsSnapshot.docs.map(doc => ({
                id: doc.id,
                vendorId: vendorId,
                categoryId: category.id,
              }));
              
              allItems.push(...items);
            }
          }
          
          setFoodItems(allItems);
          setActiveView("food");
        }
      } catch (error) {
        console.error("Error fetching stall items:", error);
        setFoodItems([]);
        setActiveView("food");
      }
    } else {
      // For shops, show categories
      try {
        // Get all categories for this vendor
        const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        // Check if categories are active
        const categoryStatusRef = ref(database, `categoryStatus/${vendorId}`);
        const categoryStatusSnapshot = await new Promise((resolve, reject) => {
          onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
        });
        
        const categoryStatus = categoryStatusSnapshot.val() || {};
        
        // Filter active categories
        const activeCategories = categoriesSnapshot.docs
          .filter(doc => categoryStatus[doc.id] === true)
          .map(doc => ({
            id: doc.id,
            vendorId: vendorId,
          }));
        
        setCategories(activeCategories);
        setActiveView("categories");
      } catch (error) {
        console.error("Error fetching shop categories:", error);
        setCategories([]);
        setActiveView("categories");
      }
    }
  } catch (error) {
    console.error("Error in vendor click handler:", error);
  } finally {
    setLoading(false);
  }
};

  // Handle when a category is clicked
  const handleCategoryClick = async (vendorId, categoryId) => {
    setLoading(true);
    try {
      // Get items from this category
      const categoryItemsRef = collection(
        db, 
        `users/${vendorId}/myMenu/${categoryId}/categoryItems`
      );
      const categoryItemsSnapshot = await getDocs(categoryItemsRef);
      
      const categoryItems = categoryItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        vendorId: vendorId,
        categoryId: categoryId,
      }));
      
      setFoodItems(categoryItems);
      setActiveView("food");
    } catch (error) {
      console.error("Error fetching category items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter function for search
  const getFilteredItems = () => {
    if (!searchQuery.trim()) {
      if (activeView === "food") return foodItems;
      if (activeView === "stalls" || activeView === "shops") return vendors;
      if (activeView === "categories") return categories;
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Filter based on active view
    if (activeView === "food") {
      // Since we don't have food item names in the state, this would require additional fetching
      // For now, we'll return all items (in a real app, you'd want to fetch and filter by name)
      return foodItems;
    } else if (activeView === "stalls" || activeView === "shops") {
      // For vendors, we can't filter here since we only have IDs
      // In a real app, you might want to fetch names and filter
      return vendors;
    } else if (activeView === "categories") {
      // For categories, we can't filter here since we only have IDs
      // In a real app, you might want to fetch names and filter
      return categories;
    }
    
    return [];
  };

  // View toggle handlers
  const showAllFood = () => {
    setSelectedVendorId(null);
    setActiveView("food");
  };

  const showStalls = () => {
    setSelectedVendorId(null);
    setVendorType("stall");
    setActiveView("stalls");
  };

  const showShops = () => {
    setSelectedVendorId(null);
    setVendorType("shop");
    setActiveView("shops");
  };

  // Get back button text based on current view
  const getBackButtonText = () => {
    if (activeView === "food" && selectedVendorId) {
      return vendorType === "shop" ? "Back to Categories" : "Back to Stalls";
    } else if (activeView === "categories") {
      return "Back to Shops";
    }
    return null;
  };

  // Handle back button click
  const handleBack = () => {
    if (activeView === "food" && selectedVendorId) {
      if (vendorType === "shop") {
        setActiveView("categories");
      } else {
        setSelectedVendorId(null);
        setActiveView("stalls");
      }
    } else if (activeView === "categories") {
      setSelectedVendorId(null);
      setActiveView("shops");
    }
  };

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

  const filteredItems = getFilteredItems();

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>
      
      {/* Search and navigation */}
      <div className="Menu-search-nav">
        <div className="Menu-search">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="Menu-search-input"
          />
        </div>
        <div className="Menu-nav-buttons">
          <button 
            className={`Menu-nav-button ${activeView === "food" && !selectedVendorId ? "active" : ""}`}
            onClick={showAllFood}
          >
            All Food
          </button>
          <button 
            className={`Menu-nav-button ${activeView === "stalls" ? "active" : ""}`}
            onClick={showStalls}
          >
            Stalls
          </button>
          <button 
            className={`Menu-nav-button ${activeView === "shops" ? "active" : ""}`}
            onClick={showShops}
          >
            Shops
          </button>
        </div>
      </div>
      
      {/* Back button when viewing categories or items */}
      {getBackButtonText() && (
        <button className="Menu-back-button" onClick={handleBack}>
          ← {getBackButtonText()}
        </button>
      )}
      
      {/* Content area */}
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
        ) : filteredItems.length > 0 ? (
          <>
            {/* Food items view */}
            {activeView === "food" && 
              filteredItems.map((item) => (
                <motion.div
                  key={`${item.vendorId}-${item.categoryId}-${item.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card fid={item.id} />
                </motion.div>
              ))
            }
            
            {/* Stalls or Shops view */}
            {(activeView === "stalls" || activeView === "shops") && 
              filteredItems.map((vendorId) => (
                <motion.div
                  key={vendorId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <VendorCard 
                    vendorid={vendorId} 
                    onVendorClick={() => handleVendorClick(vendorId)} 
                  />
                </motion.div>
              ))
            }
            
            {/* Categories view */}
            {activeView === "categories" && 
              filteredItems.map((category) => (
                <motion.div
                  key={`${category.vendorId}-${category.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <CategoryCard 
                    vendorId={category.vendorId} 
                    categoryId={category.id} 
                    onCategoryClick={handleCategoryClick} 
                  />
                </motion.div>
              ))
            }
          </>
        ) : (
          <motion.p 
            className="Menu-no-items"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {activeView === "food" ? "No food items available." :
             activeView === "stalls" ? "No stalls are open currently." :
             activeView === "shops" ? "No shops are open currently." :
             "No categories available."}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Menu;