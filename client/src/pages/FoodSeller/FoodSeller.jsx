import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./FoodSeller.css";

const FoodSeller = () => {
   const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [greeting, setGreeting] = useState("");

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    // Determine the greeting based on time
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting("Good Morning");
    } else if (hours < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }

    // Fetch user data from Firestore
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate(`/`);
  };

  return (
    <div className="food-seller-container">
      <div className="header">
        <h1 className="greeting">
          {greeting} <span className="username">{user?.username || "User"}</span>
        </h1>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="main-content">
        <div className="stall-info">
          <div className="stall-pic">
            {user?.stallImage ? (
              <img src={user.stallImage} alt="Stall" />
            ) : (
              "Stall Picture"
            )}
          </div>
          <div className="stall-details">
            <h2>{user?.stallName || "Stall Name"}</h2>
            <p>Phone No. - {user?.phone || "-"}</p>
            <p>Email - {user?.email || "-"}</p>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-pic">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              "Profile Picture"
            )}
          </div>
          <button className="change-btn">Change</button>
        </div>
      </div>
    </div>
  );
};

export default FoodSeller;
