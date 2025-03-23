import React, { useEffect, useRef } from "react";
import Home from "./Home/Home";
import Menu from "../components/Menu/Menu"; 
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const menuContentRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userType = userDoc.data().signupType;
                    navigate(userType === "Foodie" ? "/foodie" : "/food-seller");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }
    });

    return () => unsubscribe();
}, []);

  useEffect(() => {
    const handleScrollToMenu = () => {
      if (menuContentRef.current) {
        menuContentRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    window.addEventListener("scrollToMenu", handleScrollToMenu);
    return () => window.removeEventListener("scrollToMenu", handleScrollToMenu);
  }, []);

  return (
    <>
      <Home />
      <Menu ref={menuContentRef} />
    </>
  );
};

export default Landing;