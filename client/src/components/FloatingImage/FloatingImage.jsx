import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./FloatingImage.css";

const FloatingImages = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Food image data with expanded metadata and wider positioning
  const foodImages = [
    { 
      id: 1, 
      src: "images/poha.jpg", 
      alt: "Poha",
      desktopPosition: { top: "15%", left: "8%" },
      animationDelay: 0
    },
    { 
      id: 2, 
      src: "images/momos.jpg", 
      alt: "Momos",
      desktopPosition: { top: "28%", left: "36%" },
      animationDelay: 1.5
    },
    { 
      id: 3, 
      src: "images/noodles.jpg", 
      alt: "Noodles",
      desktopPosition: { top: "64%", left: "15%" },
      animationDelay: 3
    },
    { 
      id: 4, 
      src: "images/idli.jpg", 
      alt: "Idli",
      desktopPosition: { top: "15%", left: "65%" },
      animationDelay: 2
    },
    { 
      id: 5, 
      src: "images/dosa.jpg", 
      alt: "Dosa",
      desktopPosition: { top: "64%", left: "55%" },
      animationDelay: 0.5
    },
  ];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get the style for desktop positioning
  const getDesktopPositionStyle = (image) => {
    if (windowWidth >= 768) {
      return image.desktopPosition;
    }
    return {};
  };

  return (
    <div className="floating-images-container">
      {foodImages.map((image) => (
        <motion.div
          key={image.id}
          className="floating-image"
          style={getDesktopPositionStyle(image)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            transition: { 
              duration: 0.8,
              delay: image.animationDelay * 0.1
            }
          }}
          // Continuous floating animation
          whileInView={{
            y: [0, -15, 0],
            rotate: [0, 2, 0, -2, 0],
            transition: {
              y: {
                duration: 3 + image.animationDelay * 0.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              },
              rotate: {
                duration: 5 + image.animationDelay * 0.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop" 
              }
            }
          }}
          whileHover={{ 
            scale: 1.15,
            rotate: [0, 5, -5, 0],
            transition: { 
              duration: 0.6,
              rotate: {
                duration: 0.8
              }
            } 
          }}
        >
          <img src={image.src} alt={image.alt} className="floating-image-item" />
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingImages;

// import React, { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import "./FloatingImage.css";

// const FloatingImages = () => {
//   const [windowWidth, setWindowWidth] = useState(window.innerWidth);
//   const [activeImage, setActiveImage] = useState(null);

//   // Food image data
//   const foodImages = [
//     { id: 1, src: "images/poha.jpg", alt: "Poha" },
//     { id: 2, src: "images/momos.jpg", alt: "Momos" },
//     { id: 3, src: "images/noodles.jpg", alt: "Noodles" },
//     { id: 4, src: "images/idli.jpg", alt: "Idli" },
//     { id: 5, src: "images/dosa.jpg", alt: "Dosa" },
//   ];

//   // Handle window resize
//   useEffect(() => {
//     const handleResize = () => {
//       setWindowWidth(window.innerWidth);
//     };

//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   // Animation interval effect
//   useEffect(() => {
//     // Only run this effect for larger screens
//     if (windowWidth >= 768) {
//       const interval = setInterval(() => {
//         // Randomly select one image to animate
//         const randomIndex = Math.floor(Math.random() * foodImages.length);
//         setActiveImage(foodImages[randomIndex].id);
        
//         // Reset after the animation duration
//         setTimeout(() => {
//           setActiveImage(null);
//         }, 1500);
//       }, 3000);
      
//       return () => clearInterval(interval);
//     }
//   }, [windowWidth, foodImages]);

//   // Get position class based on index
//   const getPositionClass = (index) => {
//     // For smaller screens, use a simpler grid layout
//     if (windowWidth < 768) {
//       return "";
//     }
    
//     // For larger screens, use specific positioning
//     switch (index) {
//       case 0: return "top-6 left-4";
//       case 1: return "top-16 left-32";
//       case 2: return "top-32 left-8";
//       case 3: return "top-24 left-48"; 
//       case 4: return "top-48 left-32";
//       default: return "";
//     }
//   };

//   return (
//     <div className="Home-hero-images relative h-64 mt-8 md:mt-16">
//       {foodImages.map((image, index) => (
//         <motion.div
//           key={image.id}
//           className={`Home-floating-image absolute ${getPositionClass(index)}`}
//           initial={{ scale: 1 }}
//           animate={{
//             scale: activeImage === image.id ? 1.15 : 1,
//             y: activeImage === image.id ? -10 : 0,
//             transition: { 
//               duration: 1.5,
//               ease: "easeInOut"
//             }
//           }}
//           // Simple up-down motion that's always active
//           // This will be subtle on all screens
//           whileInView={{
//             y: [0, -5, 0],
//             transition: {
//               duration: 3,
//               ease: "easeInOut",
//               repeat: Infinity,
//               repeatType: "loop"
//             }
//           }}
//           whileHover={{ 
//             scale: 1.1,
//             transition: { duration: 0.3 } 
//           }}
//         >
//           <img src={image.src} alt={image.alt} />
//         </motion.div>
//       ))}
//     </div>
//   );
// };

// export default FloatingImages;

// // import React, { useEffect } from "react";
// // import { motion, useAnimation } from "framer-motion";

// // const OrganizedFloatingImages = () => {
// //   // Create separate animation controls for each image
// //   const controls1 = useAnimation();
// //   const controls2 = useAnimation();
// //   const controls3 = useAnimation();
// //   const controls4 = useAnimation();
// //   const controls5 = useAnimation();

// //   // Food image data
// //   const foodImages = [
// //     { id: 1, src: "images/poha.jpg", alt: "Poha" },
// //     { id: 2, src: "images/momos.jpg", alt: "Momos" },
// //     { id: 3, src: "images/noodles.jpg", alt: "Noodles" },
// //     { id: 4, src: "images/idli.jpg", alt: "Idli" },
// //     { id: 5, src: "images/dosa.jpg", alt: "Dosa" },
// //   ];

// //   // Predefined paths for more structured, elegant movement
// //   const animationPaths = [
// //     // First image - gentle vertical wave
// //     {
// //       y: [0, -40, 0, -20, 0],
// //       x: [0, 15, 0, -15, 0],
// //       scale: [1, 1.05, 1, 1.05, 1],
// //       rotate: [0, 3, 0, -3, 0],
// //       transition: { 
// //         duration: 12, 
// //         ease: "easeInOut",
// //         repeat: Infinity,
// //         repeatType: "loop"
// //       }
// //     },
// //     // Second image - subtle arc movement
// //     {
// //       y: [-20, -60, -30, -50, -20],
// //       x: [20, 40, 30, 10, 20],
// //       scale: [1, 1.08, 1.04, 1.08, 1],
// //       rotate: [-2, 1, 0, -1, -2],
// //       transition: { 
// //         duration: 14, 
// //         ease: "easeInOut",
// //         repeat: Infinity,
// //         repeatType: "loop"
// //       }
// //     },
// //     // Third image - slow vertical oscillation
// //     {
// //       y: [-40, -80, -60, -100, -40],
// //       x: [-20, -10, -15, -25, -20],
// //       scale: [1, 1.06, 1.02, 1.06, 1],
// //       rotate: [1, -2, 0, 2, 1],
// //       transition: { 
// //         duration: 16, 
// //         ease: "easeInOut",
// //         repeat: Infinity,
// //         repeatType: "loop"
// //       }
// //     },
// //     // Fourth image - gentle elliptical path
// //     {
// //       y: [-50, -90, -70, -30, -50],
// //       x: [30, 10, -10, 10, 30],
// //       scale: [1, 1.04, 1.02, 1.04, 1],
// //       rotate: [-1, 1, 2, 1, -1],
// //       transition: { 
// //         duration: 18, 
// //         ease: "easeInOut",
// //         repeat: Infinity,
// //         repeatType: "loop"
// //       }
// //     },
// //     // Fifth image - smooth vertical float
// //     {
// //       y: [-80, -120, -100, -60, -80],
// //       x: [-30, -40, -35, -25, -30],
// //       scale: [1, 1.07, 1.03, 1.07, 1],
// //       rotate: [2, -1, 0, 1, 2],
// //       transition: { 
// //         duration: 15, 
// //         ease: "easeInOut",
// //         repeat: Infinity,
// //         repeatType: "loop"
// //       }
// //     }
// //   ];

// //   // Start the animations on component mount
// //   useEffect(() => {
// //     const controls = [controls1, controls2, controls3, controls4, controls5];
    
// //     // Start each animation with a specific path
// //     controls.forEach((control, index) => {
// //       control.start(animationPaths[index]);
// //     });
    
// //     // Cleanup on unmount
// //     return () => {
// //       controls.forEach(control => control.stop());
// //     };
// //   }, []);

// //   // Map the controls to each image
// //   const controlsMap = [controls1, controls2, controls3, controls4, controls5];

// //   return (
// //     <div className="Home-hero-images">
// //       {foodImages.map((image, index) => (
// //         <motion.div
// //           key={image.id}
// //           className="Home-floating-image"
// //           id={`Home-floating-image-${image.id}`}
// //           animate={controlsMap[index]}
// //           initial={{ 
// //             y: animationPaths[index].y[0], 
// //             x: animationPaths[index].x[0], 
// //             scale: 1, 
// //             rotate: 0,
// //             opacity: 0 
// //           }}
// //           whileInView={{ opacity: 1 }}
// //           whileHover={{ 
// //             scale: 1.15, 
// //             zIndex: 10, 
// //             boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",
// //             transition: { duration: 0.3 } 
// //           }}
// //         >
// //           <img src={image.src} alt={image.alt} />
// //         </motion.div>
// //       ))}
// //     </div>
// //   );
// // };

// // export default OrganizedFloatingImages;


// // // import React, { useEffect } from "react";
// // // import { motion, useAnimation } from "framer-motion";

// // // const DynamicFloatingImages = () => {
// // //   // Create separate animation controls for each image
// // //   const controls1 = useAnimation();
// // //   const controls2 = useAnimation();
// // //   const controls3 = useAnimation();
// // //   const controls4 = useAnimation();
// // //   const controls5 = useAnimation();

// // //   // Food image data
// // //   const foodImages = [
// // //     { id: 1, src: "images/poha.jpg", alt: "Food 1" },
// // //     { id: 2, src: "images/momos.jpg", alt: "Food 2" },
// // //     { id: 3, src: "images/noodles.jpg", alt: "Food 3" },
// // //     { id: 4, src: "images/idli.jpg", alt: "Food 4" },
// // //     { id: 5, src: "images/dosa.jpg", alt: "Food 5" },
// // //   ];

// // //   // Get random number within a range
// // //   const getRandom = (min, max) => Math.random() * (max - min) + min;

// // //   // Different animation patterns for variety
// // //   const generateRandomAnimation = () => {
// // //     const baseDelay = getRandom(0, 1);
    
// // //     // Create different movement patterns
// // //     const patterns = [
// // //       // Larger vertical movement
// // //       {
// // //         y: [0, getRandom(-80, -150), getRandom(-40, -100), getRandom(-120, -180), 0],
// // //         x: [0, getRandom(-30, 30), getRandom(-50, 50), getRandom(-40, 40), 0],
// // //         scale: [1, getRandom(1.1, 1.3), getRandom(0.9, 1.1), getRandom(1.05, 1.2), 1],
// // //         rotate: [0, getRandom(-5, 5), getRandom(-10, 10), getRandom(-7, 7), 0],
// // //         transition: { 
// // //           duration: getRandom(10, 15), 
// // //           ease: "easeInOut",
// // //           times: [0, 0.25, 0.5, 0.75, 1]
// // //         }
// // //       },
// // //       // Circular-like movement
// // //       {
// // //         y: [0, getRandom(-40, -100), getRandom(-100, -150), getRandom(-60, -120), 0],
// // //         x: [0, getRandom(40, 80), getRandom(-30, 30), getRandom(-60, -100), 0],
// // //         scale: [1, getRandom(1.2, 1.4), getRandom(1.1, 1.3), getRandom(0.9, 1.1), 1],
// // //         rotate: [0, getRandom(8, 15), getRandom(-8, -15), getRandom(5, 10), 0],
// // //         transition: { 
// // //           duration: getRandom(12, 18), 
// // //           ease: "easeInOut",
// // //           times: [0, 0.3, 0.6, 0.8, 1]
// // //         }
// // //       },
// // //       // Figure-8 inspired movement
// // //       {
// // //         y: [0, getRandom(-80, -120), 0, getRandom(-100, -160), 0],
// // //         x: [0, getRandom(50, 90), getRandom(-50, -90), getRandom(30, 70), 0],
// // //         scale: [1, getRandom(1.1, 1.2), getRandom(1.2, 1.4), getRandom(1.1, 1.3), 1],
// // //         rotate: [0, getRandom(5, 15), getRandom(-5, -15), getRandom(10, 20), 0],
// // //         transition: { 
// // //           duration: getRandom(14, 20), 
// // //           ease: "easeInOut",
// // //           times: [0, 0.25, 0.5, 0.75, 1]
// // //         }
// // //       }
// // //     ];
    
// // //     return patterns[Math.floor(Math.random() * patterns.length)];
// // //   };

// // //   // Function to start a new random animation for a specific control
// // //   const startRandomAnimation = (control) => {
// // //     const animation = generateRandomAnimation();
// // //     control.start(animation).then(() => {
// // //       // When animation completes, start a new one
// // //       startRandomAnimation(control);
// // //     });
// // //   };

// // //   // Start the animations with staggered timing
// // //   useEffect(() => {
// // //     const controls = [controls1, controls2, controls3, controls4, controls5];
    
// // //     // Start each animation with a slight delay
// // //     controls.forEach((control, index) => {
// // //       setTimeout(() => {
// // //         startRandomAnimation(control);
// // //       }, index * 800); // Stagger start by 800ms
// // //     });
    
// // //     // Cleanup on unmount
// // //     return () => {
// // //       controls.forEach(control => control.stop());
// // //     };
// // //   }, []);

// // //   // Map the controls to each image
// // //   const controlsMap = [controls1, controls2, controls3, controls4, controls5];

// // //   return (
// // //     <div className="Home-hero-images">
// // //       {foodImages.map((image, index) => (
// // //         <motion.div
// // //           key={image.id}
// // //           className="Home-floating-image"
// // //           id={`Home-floating-image-${image.id}`}
// // //           animate={controlsMap[index]}
// // //           initial={{ y: 0, x: 0, scale: 1, rotate: 0 }}
// // //           whileHover={{ scale: 1.2, rotate: 0, transition: { duration: 0.3 } }}
// // //         >
// // //           <img src={image.src} alt={image.alt} />
// // //         </motion.div>
// // //       ))}
// // //     </div>
// // //   );
// // // };

// // // export default DynamicFloatingImages;


// // // // import React from "react";
// // // // import { motion } from "framer-motion";
// // // // import "./FloatingImage.css";

// // // // const FloatingImage = ({ src, alt, id }) => {
// // // //   return (
// // // //     <motion.div
// // // //       className="floating-image"
// // // //       id={id}
// // // //       initial={{ opacity: 0, x: -50, y: -50, scale: 0.5 }}
// // // //       animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
// // // //       transition={{
// // // //         duration: 1.5,
// // // //         ease: "easeInOut",
// // // //         type: "spring",
// // // //         stiffness: 80,
// // // //       }}
// // // //     >
// // // //       <img src={src} alt={alt} />
// // // //     </motion.div>
// // // //   );
// // // // };

// // // // export default FloatingImage;
