import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './MyOrders.css';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [foodItems, setFoodItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isAuthorized: false,
    authError: null,
    userData: null
  });

  const auth = getAuth();
  const db = getFirestore();
  const rtdb = getDatabase();

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // User is not logged in
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
        setAuthLoading(false);
        return;
      }

      try {
        // User is logged in, fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
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
          setAuthLoading(false);
          return;
        }

        // Check if user is a Foodie
        if (userData.signupType !== "Foodie") {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "Not Authorized",
              message: "This page is only accessible to Foodies.",
              returnPath: userData.signupType === "Food Seller" ? "/seller-edit-profile" : "/",
              returnText: userData.signupType === "Food Seller" ? "Go to Seller Profile" : "Go to Home"
            },
            userData
          });
          setAuthLoading(false);
          return;
        }

        // User is authenticated and authorized
        setAuthState({
          isAuthenticated: true,
          isAuthorized: true,
          authError: null,
          userData
        });
        setAuthLoading(false);

        // Fetch orders once authentication is confirmed
        fetchOrders(user.uid);

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
        setAuthLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Fetch orders from user's subcollection to get orderIds
  const fetchOrders = async (userId) => {
    try {
      setLoading(true);
      
      const activeOrderStatuses = ['cooking', 'foodieAgreed'];
      const historyOrderStatuses = ['completed', 'cancelled'];
      
      // Get all relevant orders from the user's subcollection
      const ordersRef = collection(db, `users/${userId}/orders`);
      const ordersQuery = query(
        ordersRef,
        where('status', 'in', [...activeOrderStatuses, ...historyOrderStatuses])
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort orders by creation time (newest first)
      ordersData.sort((a, b) => b.createdAt - a.createdAt);
      
      // Group orders by active vs history
      const activeOrders = [];
      const historyOrders = [];
      
      for (const order of ordersData) {
        if (activeOrderStatuses.includes(order.status)) {
          // For active orders, set up real-time listeners
          setupRealtimeListener(order.orderId, activeOrders);
        } else {
          // For history orders, fetch from Firestore
          const orderDoc = await getDoc(doc(db, "orders", order.orderId));
          if (orderDoc.exists()) {
            const detailedOrder = {
              id: orderDoc.id,
              ...orderDoc.data()
            };
            historyOrders.push(detailedOrder);
            
            // Fetch food item details if not already fetched
            if (!foodItems[detailedOrder.fid]) {
              fetchFoodItemDetails(detailedOrder.fid);
            }
          }
        }
      }
      
      setOrders({
        active: activeOrders,
        history: historyOrders
      });
      setLoading(false);
      
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  // Setup real-time listener for active orders
  const setupRealtimeListener = (orderId, activeOrdersArray) => {
    const orderRef = ref(rtdb, `orders/${orderId}`);
    
    onValue(orderRef, (snapshot) => {
      const orderData = snapshot.val();
      if (orderData) {
        // Update the order in our state
        setOrders(prevOrders => {
          const updatedActiveOrders = [...(prevOrders.active || [])];
          const existingOrderIndex = updatedActiveOrders.findIndex(o => o.id === orderId);
          
          const updatedOrder = {
            id: orderId,
            ...orderData
          };
          
          if (existingOrderIndex >= 0) {
            updatedActiveOrders[existingOrderIndex] = updatedOrder;
          } else {
            updatedActiveOrders.push(updatedOrder);
          }
          
          // Fetch food item details if needed
          if (orderData.fid && !foodItems[orderData.fid]) {
            fetchFoodItemDetails(orderData.fid);
          }
          
          // If order status changed to completed/cancelled, move to history
          if (['completed', 'cancelled'].includes(orderData.status)) {
            const newHistoryOrders = [...(prevOrders.history || [])];
            newHistoryOrders.unshift(updatedOrder);
            
            return {
              active: updatedActiveOrders.filter(o => o.id !== orderId),
              history: newHistoryOrders
            };
          }
          
          return {
            ...prevOrders,
            active: updatedActiveOrders
          };
        });
      }
    });
    
    // Return cleanup function
    return () => off(orderRef);
  };

  // Fetch food item details
  const fetchFoodItemDetails = async (fid) => {
    try {
      const foodItemDoc = await getDoc(doc(db, "foodItems", fid));
      
      if (foodItemDoc.exists()) {
        const foodItemData = {
          id: foodItemDoc.id,
          ...foodItemDoc.data()
        };
        
        setFoodItems(prev => ({
          ...prev,
          [fid]: foodItemData
        }));
      }
    } catch (error) {
      console.error("Error fetching food item details:", error);
    }
  };
  
  // Cleanup real-time listeners when component unmounts
  useEffect(() => {
    return () => {
      orders?.active?.forEach(order => {
        const orderRef = ref(rtdb, `orders/${order.id}`);
        off(orderRef);
      });
    };
  }, [orders]);

  // Get formatted date string
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status display text and color
  const getStatusInfo = (status) => {
    const statusMap = {
      cooking: { text: "Cooking", color: "#FF9800" },
      foodieAgreed: { text: "Confirmed", color: "#2196F3" },
      completed: { text: "Completed", color: "#4CAF50" },
      cancelled: { text: "Cancelled", color: "#F44336" }
    };
    
    return statusMap[status] || { text: status, color: "#757575" };
  };

  if (authLoading) {
    return <Loader />;
  }

  if (!authState.isAuthenticated || !authState.isAuthorized) {
    return <UnauthorizedPage error={authState.authError} />;
  }

  return (
    <div className="MyOrders-container">
      <h1 className="MyOrders-title">My Orders</h1>
      
      <div className="MyOrders-tabs">
        <button 
          className={`MyOrders-tab ${activeTab === 'active' ? 'MyOrders-tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Orders
        </button>
        <button 
          className={`MyOrders-tab ${activeTab === 'history' ? 'MyOrders-tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Order History
        </button>
      </div>
      
      {loading ? (
        <div className="MyOrders-loading">
          <Loader />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="MyOrders-list"
          >
            {activeTab === 'active' && (
              (orders.active && orders.active.length > 0) ? (
                orders.active.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    foodItem={foodItems[order.fid]} 
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                  />
                ))
              ) : (
                <div className="MyOrders-empty">No active orders found</div>
              )
            )}
            
            {activeTab === 'history' && (
              (orders.history && orders.history.length > 0) ? (
                orders.history.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    foodItem={foodItems[order.fid]} 
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                  />
                ))
              ) : (
                <div className="MyOrders-empty">No order history found</div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, foodItem, formatDate, getStatusInfo }) => {
  const { text: statusText, color: statusColor } = getStatusInfo(order.status);
  
  return (
    <motion.div 
      className="MyOrders-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="MyOrders-card-content">
        <div className="MyOrders-card-image">
          {foodItem?.imageUrl ? (
            <img src={foodItem.imageUrl} alt={foodItem?.name || "Food item"} />
          ) : (
            <div className="MyOrders-card-image-placeholder">
              <span>Image Loading...</span>
            </div>
          )}
        </div>
        
        <div className="MyOrders-card-details">
          <h3 className="MyOrders-card-title">
            {foodItem?.name || "Loading..."}
          </h3>
          
          <p className="MyOrders-card-seller">
            Seller: {order.sellerName || "Unknown"}
          </p>
          
          <div className="MyOrders-card-info">
            <p>Quantity: {order.quantity || 0}</p>
            <p>Price: ₹{order.totalAmount || 0}</p>
            <p>Ordered on: {formatDate(order.createdAt)}</p>
          </div>
          
          <div 
            className="MyOrders-card-status"
            style={{ backgroundColor: statusColor + '20', color: statusColor }}
          >
            {statusText}
          </div>
        </div>
      </div>
      
      {order.note && (
        <div className="MyOrders-card-note">
          <p><strong>Note:</strong> {order.note}</p>
        </div>
      )}
      
      {order.status === 'completed' && order.completedAt && (
        <div className="MyOrders-card-completed">
          <p>Completed on: {formatDate(order.completedAt)}</p>
        </div>
      )}
      
      {order.status === 'cancelled' && order.cancelledAt && (
        <div className="MyOrders-card-cancelled">
          <p>Cancelled on: {formatDate(order.cancelledAt)}</p>
          {order.cancellationReason && (
            <p>Reason: {order.cancellationReason}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MyOrders;