import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import "./Navbar.css";
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const Navbar = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { navigateAndScroll } = useScrollNavigation();

  const [user, setUser] = useState(null);
  const [signupType, setSignupType] = useState(null);
  const [photoURL, setPhotoURL] = useState("");

  const dummyPhoto = "images/dummy-user-image.jpg";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPhotoURL(currentUser.photoURL || dummyPhoto);
  
        // Fetch extra user details from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSignupType(userData.signupType);
  
          // Force a state update to trigger re-render of profile pic
          setTimeout(() => {
            setPhotoURL(userData.photoURL || dummyPhoto);
          }, 100); 
        }
      } else {
        setUser(null);
        setSignupType(null);
        setPhotoURL(dummyPhoto);
      }
    });
  
    return () => unsubscribe();
  }, [auth]);
  

  const handleLogoClick = () => {
    if (!user) {
      navigate("/");
    } else {
      navigate(signupType === "Foodie" ? "/foodie" : "/food-seller");
    }
  };

  const handleAboutUsClick = () => {
    navigateAndScroll('/', 'Menu');
  };

  return (
    <nav className="nav-container">
      <div className="nav-left" >
        <img src="images/EazyBites.png" className="nav-name" alt="logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
      </div>
      <div className="nav-center" >
        <img src="final_logo.png" alt="Logo" className="nav-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <button className="nav-dashboard" onClick={() => navigate(signupType === "Foodie" ? "/foodie" : "/food-seller")}>
              <img src={photoURL} alt="User" className="nav-profile-pic" referrerPolicy="no-referrer" />
            </button>
            <button
              className="nav-button"
              onClick={() => navigate(signupType === "Foodie" ? "/my-orders" : "/my-stall")}
            >
              {signupType === "Foodie" ? "My Orders" : "My Stall"}
            </button>
          </>
        ) : (
          <>
            <button className="nav-button" onClick={handleAboutUsClick}>
              Our Menu
            </button>
            <button className="nav-button" onClick={() => navigate("/login")}>Login</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
