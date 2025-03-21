import React, { useEffect, useRef } from "react";
import Home from "./Home/Home";

const Landing = () => {
  const futureContentRef = useRef(null);

  useEffect(() => {
    const handleScrollToAbout = () => {
      if (futureContentRef.current) {
        futureContentRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    window.addEventListener("scrollToAbout", handleScrollToAbout);
    return () => window.removeEventListener("scrollToAbout", handleScrollToAbout);
  }, []);

  return (
    <>
      <Home scrollRef={futureContentRef} />
      {/* Future content will be added here later */}
    </>
  );
};

export default Landing;

// import React, { useEffect, useRef } from "react";
// import HeroSection from "../components/Hero/HeroSection";
// import AboutUs from "../components/Hero/AboutUs";
// import Testimonials from "../components/Hero/Testimonials";

// const Landing = () => {
//   const aboutUsRef = useRef(null);

//   useEffect(() => {
//     const handleScrollToAbout = () => {
//       if (aboutUsRef.current) {
//         aboutUsRef.current.scrollIntoView({ behavior: "smooth" });
//       }
//     };

//     window.addEventListener("scrollToAbout", handleScrollToAbout);
//     return () => window.removeEventListener("scrollToAbout", handleScrollToAbout);
//   }, []);

//   return (
//     <>
//       <HeroSection />
//       <Testimonials />
//       <AboutUs ref={aboutUsRef} />
//     </>
//   );
// };

// export default Landing;
