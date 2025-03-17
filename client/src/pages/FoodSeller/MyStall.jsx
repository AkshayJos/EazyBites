import React, { useState, useEffect } from "react";
import { ref, set, onValue, off, query, orderByChild, equalTo } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { auth, database, db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UnauthorizedPage from "../Unauthorized/Unauthorized";
import Loader from "../../components/Loader/Loader";
import OrderCard from "../Order/OrderCard"; // Import the new component
import "./MyStall.css";

const MyStall = () => {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
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
        
        // Fetch orders for this seller
        const ordersRef = query(
          ref(database, "orders"), 
          orderByChild("sid"), 
          equalTo(currentUser.uid)
        );
        
        const ordersListener = onValue(ordersRef, (snapshot) => {
          const ordersData = snapshot.val();
          if (ordersData) {
            const ordersList = Object.entries(ordersData).map(([id, data]) => ({
              id,
              ...data
            }));
            
            // Sort orders by timestamp (newest first)
            ordersList.sort((a, b) => b.timestamp - a.timestamp);
            
            setOrders(ordersList);
          } else {
            setOrders([]);
          }
        });
        
        setLoading(false);
        
        return () => {
          off(storeRef, "value", statusListener);
          off(ordersRef, "value", ordersListener);
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

  const handleOrderStatusChange = (orderId, newStatus, waitTime) => {
    // Update order status locally for real-time UI update
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus, waitTime: waitTime || order.waitingTime };
        }
        return order;
      })
    );
  };

  // Filter orders by status for display
  const activeOrders = orders.filter(order => 
    !["timeoutSeller", "timeoutFoodie", "completed", "foodieDeclined", "rejected", "cancelled"].includes(order.status)
  );

  const pendingOrders = activeOrders.filter(order => order.status === "created");
  const acceptedOrders = activeOrders.filter(order => 
    ["accepted", "foodieAgreed", "cooking"].includes(order.status)
  );

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

      <div className="MyStall-orders-section">
        <h2 className="MyStall-orders-heading">New Orders</h2>
        {pendingOrders.length > 0 ? (
          <div className="MyStall-orders-container">
            <AnimatePresence>
              {pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onStatusChange={handleOrderStatusChange} 
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.p 
            className="MyStall-no-orders-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            No new orders right now.
          </motion.p>
        )}

        <h2 className="MyStall-orders-heading">In Progress Orders</h2>
        {acceptedOrders.length > 0 ? (
          <div className="MyStall-orders-container">
            <AnimatePresence>
              {acceptedOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onStatusChange={handleOrderStatusChange} 
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.p 
            className="MyStall-no-orders-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            No orders in progress.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default MyStall;