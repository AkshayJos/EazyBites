import React, { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import "./Menu.css";

const Menu = () => {
  const [foodItems, setFoodItems] = useState([]);

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
      const stalls = snapshot.val();
      if (!stalls) {
        setFoodItems([]);
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
    };

    onValue(stallStatusRef, handleStallStatusUpdate);

    return () => off(stallStatusRef, "value", handleStallStatusUpdate);
  }, []);

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>
      <div className="Menu-grid">
        {foodItems.length > 0 ? (
          foodItems.map((item) => (
            <div key={item.id} className="Menu-card">
              <p className="Menu-card-title">{item.name}</p>
              <p className="Menu-card-price">${item.price}</p>
            </div>
            
          ))
        ) : (
          <p className="Menu-no-items">No food items available.</p>
        )}
      </div>
    </div>
  );
};

export default Menu;
// {/* <div className="food-grid">
//   {foodItems.map(item => (
//     <Card key={item.fid} uid={item.stallId} fid={item.id} />
//   ))}
// </div> */}