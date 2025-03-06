import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import './Order.css';

// API URL
const API = process.env.REACT_APP_API;

const Order = () => {
    const [searchParams] = useSearchParams();
    const fid = searchParams.get('fid');
    const [itemData, setItemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true); // Separate loading state for item data
    const [quantity, setQuantity] = useState(1);
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isAuthorized: false,
        authError: null,
        userData: null
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // User is not logged in
                setAuthState({
                    isAuthenticated: false,
                    isAuthorized: false,
                    authError: {
                        title: "Authentication Required",
                        message: "Please login to place an order.",
                        returnPath: "/login",
                        returnText: "Go to Login"
                    },
                    userData: null
                });
                setLoading(false);
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
                    setLoading(false);
                    return;
                }

                // Check if user is a Foodie and has a phone number
                if (userData.signupType !== "Foodie" || !userData.phoneNumber) {
                    setAuthState({
                        isAuthenticated: true,
                        isAuthorized: false,
                        authError: {
                            title: "Not Authorized",
                            message: userData.signupType !== "Foodie" 
                                ? "Only Foodies can place orders." 
                                : "Please complete your profile by adding a phone number.",
                            returnPath: userData.signupType !== "Foodie" ? "/" : "/foodie-edit-profile",
                            returnText: userData.signupType !== "Foodie" ? "Go to Home" : "Complete Profile"
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
                setLoading(false);

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

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchItemData = async () => {
            if (authState.isAuthenticated && authState.isAuthorized) {
                setDataLoading(true); // Start loading state for data fetching
                try {
                    const response = await axios.get(`${API}/food/foodItem/${fid}`);
                    setItemData(response.data);
                } catch (error) {
                    console.error('Error fetching item data:', error);
                    // We don't set itemData to null here, keep previous state if any
                } finally {
                    setDataLoading(false);
                }
            }
        };

        fetchItemData();
    }, [fid, authState.isAuthenticated, authState.isAuthorized]);

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity >= 1 && newQuantity <= 5) {
            setQuantity(newQuantity);
        }
    };

    const handlePlaceOrder = () => {
        // TODO: Implement order placement logic
        console.log('Placing order:', {
            itemId: fid,
            quantity,
            totalPrice: itemData.price * quantity
        });
    };

    // Show loader when authentication is being checked or when data is being fetched
    if (loading || (authState.isAuthenticated && authState.isAuthorized && dataLoading)) {
        return <Loader />;
    }

    if (!fid) {
        return <div className="Order-error">No food item ID provided in the URL</div>;
    }

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

    // Only show error if we're not loading and there's no data
    if (!dataLoading && !itemData) {
        return <div className="Order-error">Unable to load item details</div>;
    }

    return (
        <div className="Order-container">
            <motion.div 
                className="Order-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="Order-image-gallery">
                    <AnimatePresence>
                        {itemData && itemData.photoURLs && itemData.photoURLs.map((url, index) => (
                            <motion.img 
                                key={index}
                                src={url} 
                                alt={`${itemData.name} - view ${index + 1}`}
                                className="Order-image"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                <div className="Order-details">
                    {itemData && (
                        <>
                            <motion.h1 
                                className="Order-name"
                                whileHover={{ scale: 1.05 }}
                            >
                                {itemData.name}
                            </motion.h1>

                            <div className="Order-info">
                                <p className="Order-stall">Stall: {itemData.stallName}</p>
                                <div className="Order-rating">
                                    <span>Rating: {itemData.rating ? itemData.rating.toFixed(2) : "N/A"}</span>
                                </div>
                            </div>

                            <p className="Order-description">{itemData.description}</p>

                            <div className="Order-purchase-section">
                                <div className="Order-price">
                                    <span>₹{parseFloat(itemData.price).toFixed(2)}</span>
                                </div>

                                <div className="Order-quantity">
                                    <button 
                                        onClick={() => handleQuantityChange(quantity - 1)}
                                        disabled={quantity <= 1}
                                        className="Order-quantity-btn"
                                    >
                                        -
                                    </button>
                                    <span className="Order-quantity-display">{quantity}</span>
                                    <button 
                                        onClick={() => handleQuantityChange(quantity + 1)}
                                        disabled={quantity >= 5}
                                        className="Order-quantity-btn"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <motion.button 
                                className="Order-place-button"
                                onClick={handlePlaceOrder}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Place Order
                            </motion.button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Order;