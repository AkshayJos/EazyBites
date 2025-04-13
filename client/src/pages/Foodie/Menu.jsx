import React, { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import Card from "../../components/FoodItemCard/Card";
import VendorCard from "./Vendor/VendorCard";
import CategoryCard from "./Category/CategoryCard";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
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
  const [vendorStatus, setVendorStatus] = useState({});
  const [categoryStatuses, setCategoryStatuses] = useState({});
  const [vendorTypes, setVendorTypes] = useState({});
  const initialLoadCompleted = useRef(false);
  const vendorsMapRef = useRef(new Map());
  const categoriesMapRef = useRef(new Map());
  const hasFetchedInitialData = useRef(false);

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

  // Function to fetch search results from API using Axios
  const fetchSearchResults = async (query) => {
    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: query },
        headers: {
          "Content-Type": "application/json",
        },
      });

      setSearchResults(response.data.results);
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

  // Store the full item data with references for faster updates
  const foodItemsMapRef = useRef(new Map());

  // Set up real-time listeners for vendor types
  useEffect(() => {
    const vendorTypeRef = ref(database, "vendorType");

    const vendorTypeListener = onValue(vendorTypeRef, (snapshot) => {
      const types = snapshot.val() || {};
      setVendorTypes(types);

      // After initial load, update vendors if we're in stalls or shops view
      if (initialLoadCompleted.current && (activeView === "stalls" || activeView === "shops") && !searchQuery.trim()) {
        updateVendorsForType(activeView === "stalls" ? "stall" : "shop", types, vendorStatus);
      }
    });

    return () => {
      vendorTypeListener();
    };
  }, [activeView, searchQuery]);

  // Set up real-time listeners for vendor status
  useEffect(() => {
    const vendorStatusRef = ref(database, "vendorStatus");

    const vendorStatusListener = onValue(vendorStatusRef, (snapshot) => {
      const newStatus = snapshot.val() || {};
      const prevStatus = vendorStatus;

      setVendorStatus(newStatus);

      // After initial load, handle gradual updates based on the active view
      if (initialLoadCompleted.current && !searchQuery.trim()) {
        if (activeView === "food") {
          // Find vendors that changed status
          const changedVendors = Object.keys({ ...prevStatus, ...newStatus }).filter(
            (vendorId) => prevStatus[vendorId] !== newStatus[vendorId]
          );

          if (changedVendors.length > 0) {
            // Update food items incrementally based on vendor status changes
            updateFoodItemsForVendors(changedVendors, newStatus);
          }
        } else if (activeView === "stalls" || activeView === "shops") {
          // Update vendors list based on type and new status
          updateVendorsForType(activeView === "stalls" ? "stall" : "shop", vendorTypes, newStatus);
        } else if (activeView === "categories" && selectedVendorId) {
          // If selected vendor goes offline, clear categories
          if (newStatus[selectedVendorId] !== true) {
            setCategories([]);
          } else {
            // Otherwise refresh categories for the selected vendor
            updateCategoriesForVendor(selectedVendorId, categoryStatuses);
          }
        }
      }
    });

    return () => {
      vendorStatusListener();
    };
  }, [activeView, searchQuery, vendorStatus, vendorTypes, selectedVendorId]);

  // Listen for all category status changes globally
  useEffect(() => {
    const categoryStatusRef = ref(database, "categoryStatus");

    const categoryStatusListener = onValue(categoryStatusRef, (snapshot) => {
      const newStatuses = snapshot.val() || {};
      const prevStatuses = categoryStatuses;

      setCategoryStatuses(newStatuses);

      // After initial load, handle gradual updates based on the active view
      if (initialLoadCompleted.current && !searchQuery.trim()) {
        if (activeView === "food") {
          // Find which vendors have category changes
          const changedVendors = new Set();

          // Check all vendors in both previous and new statuses
          const allVendors = new Set([...Object.keys(prevStatuses), ...Object.keys(newStatuses)]);

          allVendors.forEach((vendorId) => {
            const prevVendorCategories = prevStatuses[vendorId] || {};
            const newVendorCategories = newStatuses[vendorId] || {};

            // Check if any category status changed for this vendor
            const allCategories = new Set([
              ...Object.keys(prevVendorCategories),
              ...Object.keys(newVendorCategories),
            ]);

            for (const categoryId of allCategories) {
              if (prevVendorCategories[categoryId] !== newVendorCategories[categoryId]) {
                changedVendors.add(vendorId);
                break;
              }
            }
          });

          // Update food items for vendors with changed categories
          if (changedVendors.size > 0) {
            updateFoodItemsForVendors(Array.from(changedVendors), vendorStatus, newStatuses);
          }
        } else if (activeView === "categories" && selectedVendorId) {
          // Update categories for the selected vendor
          updateCategoriesForVendor(selectedVendorId, newStatuses);
        }
      }
    });

    return () => {
      categoryStatusListener();
    };
  }, [activeView, searchQuery, vendorStatus, categoryStatuses, selectedVendorId]);

  // Update vendors list based on type and status changes
  const updateVendorsForType = (type, currentVendorTypes, currentVendorStatus) => {
    try {
      const updatedVendors = Object.entries(currentVendorTypes)
        .filter(([vendorId, vendorType]) => vendorType.toLowerCase() === type.toLowerCase() && currentVendorStatus[vendorId] === true)
        .map(([vendorId]) => vendorId);

      setVendors(updatedVendors);
    } catch (error) {
      console.error(`Error updating ${type}s:`, error);
    }
  };

  // Update categories list for a specific vendor
  const updateCategoriesForVendor = async (vendorId, currentCategoryStatuses) => {
    try {
      if (!vendorId || vendorStatus[vendorId] !== true) {
        setCategories([]);
        return;
      }

      // Get category status for this vendor
      const vendorCategoryStatus = currentCategoryStatuses[vendorId] || {};

      // If we already have categories fetched for this vendor, update based on status
      if (categoriesMapRef.current.has(vendorId)) {
        const allVendorCategories = categoriesMapRef.current.get(vendorId);

        // Filter to only active categories
        const activeCategories = allVendorCategories
          .filter((category) => vendorCategoryStatus[category.id] === true)
          .map((category) => ({
            id: category.id,
            vendorId: vendorId,
          }));

        setCategories(activeCategories);
      } else {
        // Otherwise, fetch all categories and store them
        const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
        const categoriesSnapshot = await getDocs(categoriesRef);

        const allCategories = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          vendorId: vendorId,
        }));

        // Store all categories for this vendor
        categoriesMapRef.current.set(vendorId, allCategories);

        // Filter to only active categories
        const activeCategories = allCategories.filter((category) => vendorCategoryStatus[category.id] === true);

        setCategories(activeCategories);
      }
    } catch (error) {
      console.error("Error updating categories:", error);
      setCategories([]);
    }
  };

  // Update food items incrementally based on status changes
  const updateFoodItemsForVendors = async (changedVendors, currentVendorStatus, currentCategoryStatuses = categoryStatuses) => {
    try {
      // Remove food items for inactive vendors or vendors with inactive categories
      if (selectedVendorId) {
        // If a vendor is selected but went offline, clear everything
        if (changedVendors.includes(selectedVendorId) && !currentVendorStatus[selectedVendorId]) {
          setFoodItems([]);
          return;
        }
      } else {
        // For "All Food" view, filter out food items from inactive vendors
        setFoodItems((prevItems) =>
          prevItems.filter(
            (item) =>
              currentVendorStatus[item.vendorId] === true &&
              (!currentCategoryStatuses[item.vendorId] || currentCategoryStatuses[item.vendorId][item.categoryId] === true)
          )
        );
      }

      // Add new food items for newly active vendors
      const vendorsToAdd = changedVendors.filter(
        (vendorId) => currentVendorStatus[vendorId] === true && (!selectedVendorId || selectedVendorId === vendorId)
      );

      if (vendorsToAdd.length > 0) {
        const newItems = [];

        for (const vendorId of vendorsToAdd) {
          const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
          const categoriesSnapshot = await getDocs(categoriesRef);

          const vendorCategoryStatuses = currentCategoryStatuses[vendorId] || {};

          for (const categoryDoc of categoriesSnapshot.docs) {
            const categoryId = categoryDoc.id;

            if (vendorCategoryStatuses[categoryId] === true && (!selectedCategoryId || selectedCategoryId === categoryId)) {
              const categoryItemsRef = collection(db, `users/${vendorId}/myMenu/${categoryId}/categoryItems`);
              const categoryItemsSnapshot = await getDocs(categoryItemsRef);

              const items = categoryItemsSnapshot.docs.map((doc) => ({
                id: doc.id,
                vendorId: vendorId,
                categoryId: categoryId,
              }));

              newItems.push(...items);
            }
          }
        }

        // Merge new items with existing ones
        setFoodItems((prevItems) => {
          // Create lookup for existing items to avoid duplicates
          const existingItemIds = new Set(prevItems.map((item) => `${item.vendorId}-${item.categoryId}-${item.id}`));

          // Filter out any duplicates
          const uniqueNewItems = newItems.filter(
            (item) => !existingItemIds.has(`${item.vendorId}-${item.categoryId}-${item.id}`)
          );

          return [...prevItems, ...uniqueNewItems];
        });
      }
    } catch (error) {
      console.error("Error updating food items:", error);
    }
  };

  // Initial fetch of food items
  const fetchAllFoodItems = async (initialLoad = false) => {
    if (searchQuery.trim()) return;

    setLoading(true);

    try {
      const allFoodItems = [];

      // Get all active vendors
      const liveVendors = Object.entries(vendorStatus)
        .filter(([_, isLive]) => isLive === true)
        .map(([vendorId]) => vendorId);

      // If a specific vendor is selected, only use that vendor if it's active
      const targetVendors = selectedVendorId
        ? vendorStatus[selectedVendorId] === true
          ? [selectedVendorId]
          : []
        : liveVendors;

      if (targetVendors.length === 0) {
        setFoodItems([]);
        setLoading(false);
        if (initialLoad) initialLoadCompleted.current = true;
        return;
      }

      // Process each vendor
      for (const vendorId of targetVendors) {
        // Get this vendor's categories
        const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
        const categoriesSnapshot = await getDocs(categoriesRef);

        // Get category statuses for this vendor
        const vendorCategoryStatuses = categoryStatuses[vendorId] || {};

        // Store categories for this vendor for later use
        const vendorCategories = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          vendorId: vendorId,
        }));
        categoriesMapRef.current.set(vendorId, vendorCategories);

        // Process each category
        for (const categoryDoc of categoriesSnapshot.docs) {
          const categoryId = categoryDoc.id;

          // Only include active categories that match selection (if any)
          if (vendorCategoryStatuses[categoryId] === true && (!selectedCategoryId || selectedCategoryId === categoryId)) {
            // Get items in this category
            const categoryItemsRef = collection(db, `users/${vendorId}/myMenu/${categoryId}/categoryItems`);
            const categoryItemsSnapshot = await getDocs(categoryItemsRef);

            // Add the items to our collection
            const items = categoryItemsSnapshot.docs.map((doc) => ({
              id: doc.id,
              vendorId: vendorId,
              categoryId: categoryId,
            }));

            allFoodItems.push(...items);
          }
        }
      }

      setFoodItems(allFoodItems);

      // Mark initial load as complete
      if (initialLoad) initialLoadCompleted.current = true;
    } catch (error) {
      console.error("Error fetching all food items:", error);
      setFoodItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle initial data fetching
  useEffect(() => {
    if (hasFetchedInitialData.current || searchQuery.trim()) return;

    const fetchAndProcessData = async () => {
      // Wait until vendorStatus is populated
      if (activeView === "food" && Object.keys(vendorStatus).length === 0) {
        return;
      }

      setLoading(true);
      try {
        if (activeView === "food") {
          await fetchAllFoodItems(true);
        } else if (activeView === "stalls") {
          await fetchVendorsByType("stall");
        } else if (activeView === "shops") {
          await fetchVendorsByType("shop");
        } else if (activeView === "categories" && selectedVendorId) {
          await fetchCategories();
        }
        hasFetchedInitialData.current = true;
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
        if (!initialLoadCompleted.current) initialLoadCompleted.current = true;
      }
    };

    fetchAndProcessData();
  }, [vendorStatus, activeView, selectedVendorId, selectedCategoryId, searchQuery]);

  // Handle view changes
  useEffect(() => {
    const fetchViewData = async () => {
      if (searchQuery.trim() || !hasFetchedInitialData.current) return;

      setLoading(true);
      try {
        if (activeView === "food") {
          await fetchAllFoodItems();
        } else if (activeView === "stalls") {
          await fetchVendorsByType("stall");
        } else if (activeView === "shops") {
          await fetchVendorsByType("shop");
        } else if (activeView === "categories" && selectedVendorId) {
          await fetchCategories();
        }
      } catch (error) {
        console.error("Error fetching view data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewData();
  }, [activeView, selectedVendorId, selectedCategoryId, searchQuery]);

  // Fetch vendors by type with real-time status
  const fetchVendorsByType = async (type) => {
    try {
      if (!vendorStatus) {
        setVendors([]);
        return;
      }

      // Get all vendor types
      const vendorTypeRef = ref(database, "vendorType");
      const vendorTypeSnapshot = await new Promise((resolve, reject) => {
        onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
      });

      const allVendorTypes = vendorTypeSnapshot.val() || {};

      // Store vendor types for future updates
      setVendorTypes(allVendorTypes);

      // Filter to this type and active vendors
      const typeVendors = Object.entries(allVendorTypes)
        .filter(([vendorId, vendorType]) => vendorType.toLowerCase() === type.toLowerCase() && vendorStatus[vendorId] === true)
        .map(([vendorId]) => vendorId);

      setVendors(typeVendors);
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error);
      setVendors([]);
    }
  };

  // Fetch categories with real-time status
  const fetchCategories = async () => {
    try {
      if (!selectedVendorId || vendorStatus[selectedVendorId] !== true) {
        setCategories([]);
        return;
      }

      const categoriesRef = collection(db, `users/${selectedVendorId}/myMenu`);
      const categoriesSnapshot = await getDocs(categoriesRef);

      // Get category status for this vendor
      const vendorCategoryStatus = categoryStatuses[selectedVendorId] || {};

      // Store all categories for this vendor
      const allCategories = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        vendorId: selectedVendorId,
      }));

      categoriesMapRef.current.set(selectedVendorId, allCategories);

      // Filter to only active categories
      const activeCategories = allCategories.filter((category) => vendorCategoryStatus[category.id] === true);

      setCategories(activeCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  const handleVendorClick = async (vendorId) => {
    // Check if vendor is still active
    if (vendorStatus[vendorId] !== true) {
      console.log("This vendor is no longer active");
      return;
    }

    setSelectedVendorId(vendorId);
    setSelectedCategoryId(null);
    setLoading(true);
    initialLoadCompleted.current = false;

    try {
      // Get vendor type
      let currentVendorType = vendorTypes[vendorId]?.toLowerCase();

      // If we don't have it in state, fetch it
      if (!currentVendorType) {
        const vendorTypeRef = ref(database, `vendorType/${vendorId}`);
        const vendorTypeSnapshot = await new Promise((resolve, reject) => {
          onValue(vendorTypeRef, resolve, { onlyOnce: true }, reject);
        });

        currentVendorType = vendorTypeSnapshot.val()?.toLowerCase() || "shop";
      }

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
    // Check if vendor and category are still active
    if (vendorStatus[vendorId] !== true || categoryStatuses[vendorId]?.[categoryId] !== true) {
      console.log("This vendor or category is no longer active");
      return;
    }

    setSelectedCategoryId(categoryId);
    setActiveView("food");
    initialLoadCompleted.current = false;
  };

  // View toggle handlers
  const showAllFood = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setActiveView("food");
    initialLoadCompleted.current = false;
  };

  const showStalls = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setVendorType("stall");
    setActiveView("stalls");
    initialLoadCompleted.current = false;
  };

  const showShops = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedVendorId(null);
    setSelectedCategoryId(null);
    setVendorType("shop");
    setActiveView("shops");
    initialLoadCompleted.current = false;
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
    initialLoadCompleted.current = false;
  };

  // Loading animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const dotVariants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -15, 0],
      transition: {
        repeat: Infinity,
        duration: 1,
      },
    },
  };

  // Item animation variants
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  };

  // Get items to display
  const getDisplayItems = () => {
    if (searchQuery.trim() && searchResults) {
      return searchResults.map((fid) => ({ id: fid }));
    }
    if (activeView === "food") return foodItems;
    if (activeView === "stalls" || activeView === "shops") return vendors;
    if (activeView === "categories") return categories;
    return [];
  };

  const displayItems = getDisplayItems();
  const isSearchMode = searchQuery.trim().length > 0;

  // Generate a unique key for each item for AnimatePresence to work correctly
  const getItemKey = (item, index) => {
    if (activeView === "food") {
      return `${item.vendorId || "search"}-${item.categoryId || "none"}-${item.id}`;
    } else if (activeView === "stalls" || activeView === "shops") {
      return item; // vendorId
    } else if (activeView === "categories") {
      return `${item.vendorId}-${item.id}`;
    }
    return index;
  };

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
            <button className={`Menu-nav-button ${activeView === "stalls" ? "active" : ""}`} onClick={showStalls}>
              Stalls
            </button>
            <button className={`Menu-nav-button ${activeView === "shops" ? "active" : ""}`} onClick={showShops}>
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
          <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
            <div className="loading-text">Searching for delicious options</div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
            </div>
          </motion.div>
        ) : loading && !isSearchMode ? (
          <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
            <div className="loading-text">Discovering what's cooking</div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
            </div>
          </motion.div>
        ) : displayItems.length > 0 ? (
          <>
            {isSearchMode && (
              <AnimatePresence>
                {displayItems.map((item, index) => (
                  <motion.div
                    key={`search-${item.id}`}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <Card fid={item.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!isSearchMode && (
              <>
                {activeView === "food" && (
                  <AnimatePresence>
                    {displayItems.map((item, index) => (
                      <motion.div
                        key={getItemKey(item, index)}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <Card fid={item.id} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {(activeView === "stalls" || activeView === "shops") && (
                  <AnimatePresence>
                    {displayItems.map((vendorId, index) => (
                      <motion.div
                        key={getItemKey(vendorId, index)}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <VendorCard vendorid={vendorId} onVendorClick={() => handleVendorClick(vendorId)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {activeView === "categories" && (
                  <AnimatePresence>
                    {displayItems.map((category, index) => (
                      <motion.div
                        key={getItemKey(category, index)}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <CategoryCard
                          vendorId={category.vendorId}
                          categoryId={category.id}
                          onCategoryClick={handleCategoryClick}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </>
            )}
          </>
        ) : (
          <motion.p className="Menu-no-items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {isSearchMode
              ? "No matching food items found. Try a different search term."
              : activeView === "food"
              ? "No food items available."
              : activeView === "stalls"
              ? "No stalls are open currently."
              : activeView === "shops"
              ? "No shops are open currently."
              : "No categories available."}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Menu;