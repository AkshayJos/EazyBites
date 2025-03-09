import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, set, onValue, update } from 'firebase/database';
import { auth, db, database } from '../../firebaseConfig';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import './Order.css';

// API URL
const API = process.env.REACT_APP_API;

// Generate a random token
const generateToken = () => {
    return Math.floor(1000 + Math.random() * 9000); // 4-digit token
};

const Order = () => {
    const [searchParams] = useSearchParams();
    const fid = searchParams.get('fid');
    const [itemData, setItemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [orderStatus, setOrderStatus] = useState(null);
    const [waitingTime, setWaitingTime] = useState(null);
    const [token, setToken] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'processing', 'timedout', 'accepted', 'confirmed'
    const timerRef = useRef(null);
    const orderRef = useRef(null);
    const navigate = useNavigate();
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isAuthorized: false,
        authError: null,
        userData: null
    });
    const [currentOrderIds, setCurrentOrderIds] = useState({
        globalOrderId: null,
        userOrderId: null
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
                setDataLoading(true);
                try {
                    const response = await axios.get(`${API}/food/foodItem/${fid}`);
                    setItemData(response.data);
                } catch (error) {
                    console.error('Error fetching item data:', error);
                } finally {
                    setDataLoading(false);
                }
            }
        };

        fetchItemData();
    }, [fid, authState.isAuthenticated, authState.isAuthorized]);

    // Cleanup timer when component unmounts
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (orderRef.current) orderRef.current();
        };
    }, []);

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity >= 1 && newQuantity <= 5) {
            setQuantity(newQuantity);
        }
    };

    // const handlePlaceOrder = async () => {
    //     if (!authState.isAuthenticated || !authState.isAuthorized || !itemData) {
    //         return;
    //     }

    //     try {
    //         // Set modal to processing state
    //         setModalType('processing');
    //         setShowModal(true);

    //         // Calculate total cost
    //         const totalCost = itemData.price * quantity;

    //         // Create the order in the global orders collection
    //         const ordersCollectionRef = collection(db, 'orders');
    //         const newOrderDoc = await addDoc(ordersCollectionRef, {
    //             uid: auth.currentUser.uid,
    //             fid: fid,
    //             sid: itemData.seller,
    //             quantity: quantity,
    //             totalCost: totalCost,
    //             timestamp: new Date(),
    //             status: "created"
    //         });

    //         // Save the order ID reference in the user's subcollection
    //         await addDoc(collection(db, `users/${auth.currentUser.uid}/orders`), {
    //             orderId: newOrderDoc.id,
    //             status: "created"
    //         });

    //         // Use the same document ID for the real-time database entry
    //         const orderId = newOrderDoc.id;

    //         // Create entry in real-time database
    //         const orderRtdbRef = ref(database, `orders/${orderId}`);
    //         await set(orderRtdbRef, {
    //             uid: auth.currentUser.uid,
    //             fid: fid,
    //             sid: itemData.seller,
    //             quantity: quantity,
    //             totalCost: totalCost,
    //             itemName: itemData.name,
    //             stallName: itemData.stallName,
    //             status: "created",
    //             timestamp: Date.now()
    //         });

    //         // Set a timeout of 1 minute for the seller to accept the order
    //         timerRef.current = setTimeout(async () => {
    //             // Check current status before timing out
    //             const orderSnapshot = await getDoc(doc(db, "users", auth.currentUser.uid, "orders", orderId));
    //             if (orderSnapshot.exists() && orderSnapshot.data().status === "created") {
    //                 // Update status in firestore
    //                 await updateDoc(doc(db, "users", auth.currentUser.uid, "orders", orderId), {
    //                     status: "timedout"
    //                 });

    //                 // Update status in real-time database
    //                 await update(ref(database, `orders/${orderId}`), {
    //                     status: "timedout"
    //                 });

    //                 // Update UI
    //                 setOrderStatus("timedout");
    //                 setModalType('timedout');
    //             }
    //         }, 60000); // 1 minute timeout

    //         // Listen for changes to the order in the real-time database
    //         orderRef.current = onValue(orderRtdbRef, async (snapshot) => {
    //             const data = snapshot.val();
    //             if (data) {
    //                 setOrderStatus(data.status);

    //                 // Handle different status updates
    //                 if (data.status === "accepted") {
    //                     setWaitingTime(data.waitingTime || 0);
    //                     setModalType('accepted');
    //                 } else if (data.status === "foodieAgreed") {
    //                     setToken(data.token);
    //                     setModalType('confirmed');
    //                 }

    //                 // Update the Firestore document to match RTDB
    //                 await updateDoc(doc(db, "users", auth.currentUser.uid, "orders", orderId), {
    //                     status: data.status,
    //                     ...(data.waitingTime && { waitingTime: data.waitingTime }),
    //                     ...(data.token && { token: data.token })
    //                 });
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Error placing order:', error);
    //         setModalType('error');
    //     }
    // };

    // In the handlePlaceOrder function, store the reference ID
    const handlePlaceOrder = async () => {
        if (!authState.isAuthenticated || !authState.isAuthorized || !itemData) {
            return;
        }

        try {
            // Set modal to processing state
            setModalType('processing');
            setShowModal(true);

            // Calculate total cost
            const totalCost = itemData.price * quantity;

            // Create the order in the global orders collection
            const ordersCollectionRef = collection(db, 'orders');
            const newOrderDoc = await addDoc(ordersCollectionRef, {
                uid: auth.currentUser.uid,
                fid: fid,
                sid: itemData.seller,
                quantity: quantity,
                totalCost: totalCost,
                timestamp: new Date(),
                status: "created"
            });

            // Save the order ID reference in the user's subcollection and STORE THE REFERENCE
            const userOrderRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/orders`), {
                orderId: newOrderDoc.id,
                status: "created"
            });

            // Store the user order reference ID for later use
            const userOrderId = userOrderRef.id;

            // Use the global order ID for the real-time database entry
            const orderId = newOrderDoc.id;

            // Store these IDs in state for later use
            setCurrentOrderIds({
                globalOrderId: orderId,
                userOrderId
            });

            // Create entry in real-time database
            const orderRtdbRef = ref(database, `orders/${orderId}`);
            await set(orderRtdbRef, {
                uid: auth.currentUser.uid,
                fid: fid,
                sid: itemData.seller,
                quantity: quantity,
                totalCost: totalCost,
                itemName: itemData.name,
                stallName: itemData.stallName,
                status: "created",
                timestamp: Date.now(),
                userOrderId: userOrderId
            });

            // Set a timeout of 1 minute for the seller to accept the order
            timerRef.current = setTimeout(async () => {
                // Check current status before timing out
                const orderSnapshot = await getDoc(doc(db, "orders", orderId));
                if (orderSnapshot.exists() && orderSnapshot.data().status === "created") {
                    // Update status in global orders collection
                    await updateDoc(doc(db, "orders", orderId), {
                        status: "timedout"
                    });

                    // Update status in user's orders subcollection
                    await updateDoc(doc(db, "users", auth.currentUser.uid, "orders", userOrderId), {
                        status: "timedout"
                    });

                    // Update status in real-time database
                    await update(ref(database, `orders/${orderId}`), {
                        status: "timedout"
                    });

                    // Update UI
                    setOrderStatus("timedout");
                    setModalType('timedout');
                }
            }, 60000); // 1 minute timeout

            // Listen for changes to the order in the real-time database
            orderRef.current = onValue(orderRtdbRef, async (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setOrderStatus(data.status);

                    // Handle different status updates
                    if (data.status === "accepted") {
                        setWaitingTime(data.waitingTime || 0);
                        setModalType('accepted');
                    } else if (data.status === "foodieAgreed") {
                        setToken(data.token);
                        setModalType('confirmed');
                    }

                    // Update the global Firestore order document
                    await updateDoc(doc(db, "orders", orderId), {
                        status: data.status,
                        ...(data.waitingTime && { waitingTime: data.waitingTime }),
                        ...(data.token && { token: data.token })
                    });

                    // Update the user's order document using the stored reference ID
                    await updateDoc(doc(db, "users", auth.currentUser.uid, "orders", userOrderId), {
                        status: data.status,
                        ...(data.waitingTime && { waitingTime: data.waitingTime }),
                        ...(data.token && { token: data.token })
                    });
                }
            });

        } catch (error) {
            console.error('Error placing order:', error);
            setModalType('error');
        }
    };

    const handleAcceptWaitingTime = async () => {
        try {
            // Use the stored order IDs instead of querying
            const { globalOrderId, userOrderId } = currentOrderIds;
            
            if (!globalOrderId || !userOrderId) {
                console.error('Order IDs not found');
                return;
            }
    
            const generatedToken = generateToken();
    
            // Update RTDB
            await update(ref(database, `orders/${globalOrderId}`), {
                status: 'foodieAgreed',
                token: generatedToken
            });
    
            // Update global order
            await updateDoc(doc(db, 'orders', globalOrderId), {
                status: 'foodieAgreed',
                token: generatedToken
            });
    
            // Update user's order
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'orders', userOrderId), {
                status: 'foodieAgreed',
                token: generatedToken  // Add the token here too
            });
    
            setToken(generatedToken);
            setModalType('confirmed');
        } catch (error) {
            console.error('Error accepting waiting time:', error);
        }
    };

    const handleDeclineWaitingTime = async () => {
        try {
            // Use the stored order IDs instead of querying
            const { globalOrderId, userOrderId } = currentOrderIds;
            
            if (!globalOrderId || !userOrderId) {
                console.error('Order IDs not found');
                return;
            }
    
            // Update RTDB
            await update(ref(database, `orders/${globalOrderId}`), {
                status: 'foodieDeclined'
            });
    
            // Update global order
            await updateDoc(doc(db, 'orders', globalOrderId), {
                status: 'foodieDeclined'
            });
    
            // Update user's order
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'orders', userOrderId), {
                status: 'foodieDeclined'
            });
    
            setShowModal(false);
            navigate('/menu');
        } catch (error) {
            console.error('Error declining waiting time:', error);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        if (modalType === 'timedout' || modalType === 'error') {
            // Optionally redirect the user
            navigate('/menu');
        }
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
                                disabled={orderStatus === 'created' || orderStatus === 'accepted' || orderStatus === 'foodieAgreed'}
                            >
                                Place Order
                            </motion.button>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Order Status Modal */}
            {showModal && (
                <div className="OrderModal-overlay">
                    <motion.div
                        className="OrderModal-container"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        {modalType === 'processing' && (
                            <div className="OrderModal-content">
                                <div className="OrderModal-spinner"></div>
                                <h2>Processing Your Order</h2>
                                <p>Waiting for the seller to accept your order...</p>
                                <p className="OrderModal-timer">This may take up to 1 minute</p>
                            </div>
                        )}

                        {modalType === 'timedout' && (
                            <div className="OrderModal-content">
                                <div className="OrderModal-icon OrderModal-error-icon">⚠️</div>
                                <h2>Order Timed Out</h2>
                                <p>The seller did not respond in time. Please try again later.</p>
                                <button className="OrderModal-button" onClick={closeModal}>OK</button>
                            </div>
                        )}

                        {modalType === 'accepted' && (
                            <div className="OrderModal-content">
                                <div className="OrderModal-icon OrderModal-success-icon">✓</div>
                                <h2>Order Accepted!</h2>
                                <p>The seller has accepted your order.</p>
                                <p>Estimated waiting time: <strong>{waitingTime} minutes</strong></p>
                                <p>Do you agree with this waiting time?</p>
                                <div className="OrderModal-button-group">
                                    <button className="OrderModal-button OrderModal-button-secondary" onClick={handleDeclineWaitingTime}>Decline</button>
                                    <button className="OrderModal-button" onClick={handleAcceptWaitingTime}>Accept</button>
                                </div>
                            </div>
                        )}

                        {modalType === 'confirmed' && (
                            <div className="OrderModal-content">
                                <div className="OrderModal-icon OrderModal-success-icon">✓</div>
                                <h2>Order Confirmed!</h2>
                                <p>Your order has been confirmed.</p>
                                <p className="OrderModal-token">Your token number: <strong>{token}</strong></p>
                                <p>Please reach the stall within the allotted time.</p>
                                <button className="OrderModal-button" onClick={closeModal}>OK</button>
                            </div>
                        )}

                        {modalType === 'error' && (
                            <div className="OrderModal-content">
                                <div className="OrderModal-icon OrderModal-error-icon">⚠️</div>
                                <h2>Error</h2>
                                <p>An error occurred while placing your order. Please try again.</p>
                                <button className="OrderModal-button" onClick={closeModal}>OK</button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Order;