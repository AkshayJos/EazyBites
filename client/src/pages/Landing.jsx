import React, { useEffect, useRef } from "react";
import HeroSection from "../components/Hero/HeroSection";
import AboutUs from "../components/Hero/AboutUs";

const Landing = () => {
  const aboutUsRef = useRef(null);

  useEffect(() => {
    const handleScrollToAbout = () => {
      if (aboutUsRef.current) {
        aboutUsRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    window.addEventListener("scrollToAbout", handleScrollToAbout);
    return () => window.removeEventListener("scrollToAbout", handleScrollToAbout);
  }, []);

  return (
    <>
      <HeroSection />
      <AboutUs ref={aboutUsRef} />
    </>
  );
};

export default Landing;
