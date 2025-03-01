import React, { useState, useEffect } from "react";
import { ref, set, onValue, off } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { auth, database, db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import UnauthorizedPage from "../Unauthorized/Unauthorized";
import Loader from "../../components/Loader/Loader";
import "./MyStall.css";

const MyStall = () => {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        // User not logged in, redirect to login
        navigate("/login");
        return;
      }

      setUser(currentUser);
      console.log("Current user ID:", currentUser.uid);

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.signupType) {
            setUserType(userData.signupType);
          } else {
            setError("User type not found in your profile. Please contact support.");
          }
        } else {
          setError("User profile not found. Please complete registration.");
        }
        
        const storeRef = ref(database, `stallStatus/${currentUser.uid}`);
        const statusListener = onValue(storeRef, (snapshot) => {
          setIsLive(snapshot.val() || false);
        });
        
        setLoading(false);
        
        return () => {
          off(storeRef, "value", statusListener);
        };
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Error loading user data: " + error.message);
        setLoading(false);
      }
    });

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, [navigate]);

  const handleToggle = async () => {
    if (!user) return;

    const newStatus = !isLive;
    setIsLive(newStatus); // Optimistically update UI
    
    try {
      await set(ref(database, `stallStatus/${user.uid}`), newStatus);
    } catch (error) {
      console.error("Error toggling stall status:", error);
      setIsLive(!newStatus); // Revert UI if operation fails
      alert("Failed to update stall status. Please try again.");
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="MyStall-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button 
          className="MyStall-button" 
          onClick={() => navigate("/")}
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Handle case where userType might be null
  if (userType === null) {
    return (
      <div className="MyStall-missing-data">
        <h2>Missing Profile Information</h2>
        <p>We couldn't determine your account type. You may need to complete your profile setup.</p>
        <div className="MyStall-debug-info">
          <p><strong>Debug Info:</strong></p>
          <p>User ID: {user?.uid || "Not available"}</p>
          <p>Email: {user?.email || "Not available"}</p>
        </div>
        <button 
          className="MyStall-button" 
          onClick={() => navigate("/profile/complete")}
        >
          Complete Profile
        </button>
      </div>
    );
  }

  // If user is not a food seller, show unauthorized page
  if (userType !== "Food Seller") {
    return (
      <UnauthorizedPage 
        title="Seller Access Only"
        message={`Your account type (${userType}) doesn't have permission to manage a stall. Only Food Sellers can access this page.`}
        returnPath="/foodie"
        returnText="Back to Homepage"
      />
    );
  }

  return (
    <div className="MyStall-container">
      <h1 className="MyStall-heading">My Stall</h1>
      <div className="MyStall-status">
        Current status: <span className={isLive ? "MyStall-live" : "MyStall-offline"}>
          {isLive ? "Live" : "Offline"}
        </span>
      </div>
      <div className="MyStall-toggle-container">
        <span>Set Stall Live</span>
        <label className="MyStall-switch">
          <input 
            type="checkbox" 
            checked={isLive} 
            onChange={handleToggle} 
            aria-label="Toggle stall status"
          />
          <span className="MyStall-slider"></span>
        </label>
      </div>
      <h2 className="MyStall-orders-heading">Orders</h2>
      <div className="MyStall-orders-container">
        <p className="MyStall-no-orders">No live orders yet.</p>
      </div>
    </div>
  );
};

export default MyStall;