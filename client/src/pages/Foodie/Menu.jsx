import React, { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import Card from "../../components/FoodItemCard/Card";
import VendorCard from "./Vendor/VendorCard";
import CategoryCard from "./Category/CategoryCard";
import { motion } from "framer-motion";
import "./Menu.css";

// API
const API = process.env.REACT_APP_API;

const Menu = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeView, setActiveView] = useState("food"); // "food", "stalls", "shops", "categories"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorType, setVendorType] = useState(null); // "stall" or "shop"
  const [searchResults, setSearchResults] = useState(null); // To store search API results

  // Debounce function to limit API calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounced search function
  const debouncedSearch = React.useCallback(
    debounce((query) => {
      if (query.trim().length > 0) {
        fetchSearchResults(query);
      } else {
        setSearchResults(null);
      }
    }, 300),
    []
  );

  // Function to fetch search results from API
  const fetchSearchResults = async (query) => {
    setSearchLoading(true);
    try {
      const response = await fetch(`${API}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Search API request failed');
      }
      
      const data = await response.json();
      // Assuming the API returns an array of food item IDs (fids)
      setSearchResults(data.results);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

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

    // Helper functions (unchanged)
    const fetchVendorCategories = async (vendorId) => {
      try {
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

    const fetchCategoryItems = async (vendorId, categoryId) => {
      try {
        const categoryItemsRef = collection(
          db, 
          `users/${vendorId}/myMenu/${categoryId}/categoryItems`
        );
        const categoryItemsSnapshot = await getDocs(categoryItemsRef);
        
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
        const vendorStatusRef = ref(database, "vendorStatus");
        const vendorStatusSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorStatusRef, resolve, { onlyOnce: true }, reject);
        });
        
        const vendorStatus = vendorStatusSnapshot.val() || {};
        
        const vendorTypeRef = ref(database, "vendorType");
        const vendorTypeSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
        });
        
        const vendorTypes = vendorTypeSnapshot.val() || {};
        
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

    // Only load non-search data if no search query is active
    if (!searchQuery.trim()) {
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
    }

  }, [activeView, selectedVendorId, searchQuery]);

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

  // View toggle handlers
  const showAllFood = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setActiveView("food");
  };

  const showStalls = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setVendorType("stall");
    setActiveView("stalls");
  };

  const showShops = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setVendorType("shop");
    setActiveView("shops");
  };

  // Get back button text based on current view
  const getBackButtonText = () => {
    if (activeView === "food" && selectedVendorId) {
      return vendorType === "shop" ? "Back to Categories" : "Back to Stalls";
    } else if (activeView === "categories") {
      return "Back to Cafes";
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

  // Get items to display based on search status
  const getDisplayItems = () => {
    // If there's an active search, show search results
    if (searchQuery.trim() && searchResults) {
      // Transform search results into the format expected by Card component
      return searchResults.map(fid => ({ id: fid }));
    }

    // Otherwise show regular items based on view
    if (activeView === "food") return foodItems;
    if (activeView === "stalls" || activeView === "shops") return vendors;
    if (activeView === "categories") return categories;
    return [];
  };

  const displayItems = getDisplayItems();

  // Determine if we're in search mode
  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>
      
      {/* Search and navigation */}
      <div className="Menu-search-nav">
        <div className="Menu-search">
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="Menu-search-input"
          />
        </div>
        
        {/* Only show navigation buttons when not searching */}
        {!isSearchMode && (
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
              Cafes
            </button>
          </div>
        )}
      </div>
      
      {/* Back button when viewing categories or items and not searching */}
      {!isSearchMode && getBackButtonText() && (
        <button className="Menu-back-button" onClick={handleBack}>
          ← {getBackButtonText()}
        </button>
      )}
      
      {/* Content area */}
      <div className="Menu-grid">
        {isSearchMode && searchLoading ? (
          <motion.div 
            className="Menu-loading"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="loading-text">Searching for delicious options</div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
            </div>
          </motion.div>
        ) : loading && !isSearchMode ? (
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
        ) : displayItems.length > 0 ? (
          <>
            {/* Search results */}
            {isSearchMode && (
              <>
                {displayItems.map((item) => (
                  <motion.div
                    key={`search-${item.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card fid={item.id} />
                  </motion.div>
                ))}
              </>
            )}
            
            {/* Regular views when not searching */}
            {!isSearchMode && (
              <>
                {/* Food items view */}
                {activeView === "food" && 
                  displayItems.map((item) => (
                    <motion.div
                      key={`${item.vendorId || "search"}-${item.categoryId || "result"}-${item.id}`}
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
                  displayItems.map((vendorId) => (
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
                  displayItems.map((category) => (
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
            )}
          </>
        ) : (
          <motion.p 
            className="Menu-no-items"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {isSearchMode 
              ? "No matching food items found. Try a different search term."
              : activeView === "food" 
                ? "No food items available." 
                : activeView === "stalls" 
                  ? "No stalls are open currently." 
                  : activeView === "shops" 
                    ? "No shops are open currently." 
                    : "No categories available."
            }
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Menu;