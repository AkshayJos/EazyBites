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
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isAuthorized: false,
    authError: null,
    userData: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        // User not logged in, set auth state accordingly
        setAuthState({
          isAuthenticated: false,
          isAuthorized: false,
          authError: {
            title: "Authentication Required",
            message: "Please login to access this page.",
            returnPath: "/login",
            returnText: "Go to Login"
          },
          userData: null
        });
        setLoading(false);
        return;
      }

      setUser(currentUser);
      console.log("Current user ID:", currentUser.uid);

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "User Profile Not Found",
              message: "Your user profile could not be found.",
              returnPath: "/",
              returnText: "Go to Home"
            },
            userData: null
          });
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        
        // Check if user is a Food Seller
        if (userData.signupType !== "Food Seller") {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "Not Authorized",
              message: `This page is only accessible to Food Sellers. Your account type is ${userData.signupType}.`,
              returnPath: userData.signupType === "Foodie" ? "/foodie" : "/",
              returnText: userData.signupType === "Foodie" ? "Go to Foodie Dashboard" : "Go to Home"
            },
            userData
          });
          setLoading(false);
          return;
        }
        
        // Check if seller has set phoneNumber
        if (!userData.phoneNumber) {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "Profile Incomplete",
              message: "Please set your phone number before accessing this page.",
              returnPath: "/seller-edit-profile",
              returnText: "Complete Your Profile"
            },
            userData
          });
          setLoading(false);
          return;
        }

        // User is authenticated and authorized
        setAuthState({
          isAuthenticated: true,
          isAuthorized: true,
          authError: null,
          userData
        });
        
        // Fetch stall status
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
        setAuthState({
          isAuthenticated: true,
          isAuthorized: false,
          authError: {
            title: "Error",
            message: "An error occurred while verifying your access. Please try again.",
            returnPath: "/",
            returnText: "Go to Home"
          },
          userData: null
        });
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

  // Handle cases where user is not authenticated or authorized
  if (!authState.isAuthenticated || !authState.isAuthorized) {
    return (
      <UnauthorizedPage 
        title={authState.authError.title}
        message={authState.authError.message}
        returnPath={authState.authError.returnPath}
        returnText={authState.authError.returnText}
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