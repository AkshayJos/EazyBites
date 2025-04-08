import React, { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
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
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [vendorType, setVendorType] = useState(null); // "stall" or "shop"
  const [searchResults, setSearchResults] = useState(null);

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
    // Fetch food items function
    const fetchFoodItems = async () => {
      setLoading(true);
      try {
        const vendorStatusRef = ref(database, "vendorStatus");
        const vendorStatusSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorStatusRef, resolve, { onlyOnce: true }, reject);
        });
        
        const vendors = vendorStatusSnapshot.val();
        if (!vendors) {
          setFoodItems([]);
          setLoading(false);
          return;
        }

        const liveVendors = Object.entries(vendors)
          .filter(([_, isLive]) => isLive)
          .map(([vendorId]) => vendorId);

        const allFoodItems = [];
        
        // If a specific vendor is selected, only fetch its items
        const targetVendors = selectedVendorId ? [selectedVendorId] : liveVendors;

        for (const vendorId of targetVendors) {
          const categoryStatusRef = ref(database, `categoryStatus/${vendorId}`);
          const categoryStatusSnapshot = await new Promise((resolve, reject) => {
            onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
          });
          
          const categoryStatus = categoryStatusSnapshot.val();
          if (!categoryStatus) continue;
          
          const vendorCategories = await fetchVendorCategories(vendorId);
          
          for (const category of vendorCategories) {
            if (categoryStatus[category.id] === true && 
                (!selectedCategoryId || selectedCategoryId === category.id)) {
              const categoryItems = await fetchCategoryItems(vendorId, category.id);
              allFoodItems.push(...categoryItems);
            }
          }
        }

        setFoodItems(allFoodItems);
      } catch (error) {
        console.error("Error fetching food items:", error);
        setFoodItems([]);
      } finally {
        setLoading(false);
      }
    };

    // Helper functions
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

    // Fetch vendors by type
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
      } catch (error) {
        console.error(`Error fetching ${type}s:`, error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    // Load data based on view and search state
    if (!searchQuery.trim()) {
      if (activeView === "food") {
        fetchFoodItems();
      } else if (activeView === "stalls") {
        fetchVendorsByType("stall");
      } else if (activeView === "shops") {
        fetchVendorsByType("shop");
      } else if (activeView === "categories" && selectedVendorId) {
        const fetchCategories = async () => {
          setLoading(true);
          try {
            const categoriesRef = collection(db, `users/${selectedVendorId}/myMenu`);
            const categoriesSnapshot = await getDocs(categoriesRef);
            const categoryStatusRef = ref(database, `categoryStatus/${selectedVendorId}`);
            const categoryStatusSnapshot = await new Promise((resolve, reject) => {
              onValue(categoryStatusRef, resolve, { onlyOnce: true }, reject);
            });
            const categoryStatus = categoryStatusSnapshot.val() || {};
            
            const activeCategories = categoriesSnapshot.docs
              .filter(doc => categoryStatus[doc.id] === true)
              .map(doc => ({
                id: doc.id,
                vendorId: selectedVendorId,
              }));
            
            setCategories(activeCategories);
          } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
          } finally {
            setLoading(false);
          }
        };
        fetchCategories();
      }
    }

  }, [activeView, selectedVendorId, selectedCategoryId, searchQuery]);

  const handleVendorClick = async (vendorId) => {
    setSelectedVendorId(vendorId);
    setSelectedCategoryId(null);
    setLoading(true);
    
    try {
      const vendorTypeRef = ref(database, `vendorType/${vendorId}`);
      const vendorTypeSnapshot = await new Promise((resolve, reject) => {
        onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
      });
      
      const currentVendorType = vendorTypeSnapshot.val()?.toLowerCase() || "shop";
      setVendorType(currentVendorType);
      
      if (currentVendorType === "stall") {
        setActiveView("food");
      } else {
        setActiveView("categories");
      }
    } catch (error) {
      console.error("Error in vendor click handler:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (vendorId, categoryId) => {
    setSelectedCategoryId(categoryId);
    setActiveView("food");
  };

  // View toggle handlers
  const showAllFood = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setActiveView("food");
  };

  const showStalls = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setVendorType("stall");
    setActiveView("stalls");
  };

  const showShops = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setVendorType("shop");
    setActiveView("shops");
  };

  // Get back button text
  const getBackButtonText = () => {
    if (activeView === "food" && selectedVendorId) {
      return vendorType === "shop" && selectedCategoryId ? "Back to Categories" : "Back to Stalls";
    } else if (activeView === "categories") {
      return "Back to Cafes";
    }
    return null;
  };

  // Handle back button click
  const handleBack = () => {
    if (activeView === "food" && selectedVendorId) {
      if (vendorType === "shop" && selectedCategoryId) {
        setSelectedCategoryId(null);
        setActiveView("categories");
      } else {
        setSelectedVendorId(null);
        setSelectedCategoryId(null);
        setActiveView(vendorType === "stall" ? "stalls" : "shops");
      }
    } else if (activeView === "categories") {
      setSelectedVendorId(null);
      setSelectedCategoryId(null);
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

  // Get items to display
  const getDisplayItems = () => {
    if (searchQuery.trim() && searchResults) {
      return searchResults.map(fid => ({ id: fid }));
    }
    if (activeView === "food") return foodItems;
    if (activeView === "stalls" || activeView === "shops") return vendors;
    if (activeView === "categories") return categories;
    return [];
  };

  const displayItems = getDisplayItems();
  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>
      
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
      
      {!isSearchMode && getBackButtonText() && (
        <button className="Menu-back-button" onClick={handleBack}>
          ← {getBackButtonText()}
        </button>
      )}
      
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
            {isSearchMode && (
              displayItems.map((item) => (
                <motion.div
                  key={`search-${item.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card fid={item.id} />
                </motion.div>
              ))
            )}
            
            {!isSearchMode && (
              <>
                {activeView === "food" && 
                  displayItems.map((item) => (
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