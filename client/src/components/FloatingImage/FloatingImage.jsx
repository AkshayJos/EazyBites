import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

const DynamicFloatingImages = () => {
  // Create separate animation controls for each image
  const controls1 = useAnimation();
  const controls2 = useAnimation();
  const controls3 = useAnimation();
  const controls4 = useAnimation();
  const controls5 = useAnimation();

  // Food image data
  const foodImages = [
    { id: 1, src: "images/poha.jpg", alt: "Food 1" },
    { id: 2, src: "images/momos.jpg", alt: "Food 2" },
    { id: 3, src: "images/noodles.jpg", alt: "Food 3" },
    { id: 4, src: "images/idli.jpg", alt: "Food 4" },
    { id: 5, src: "images/dosa.jpg", alt: "Food 5" },
  ];

  // Get random number within a range
  const getRandom = (min, max) => Math.random() * (max - min) + min;

  // Different animation patterns for variety
  const generateRandomAnimation = () => {
    const baseDelay = getRandom(0, 1);
    
    // Create different movement patterns
    const patterns = [
      // Larger vertical movement
      {
        y: [0, getRandom(-80, -150), getRandom(-40, -100), getRandom(-120, -180), 0],
        x: [0, getRandom(-30, 30), getRandom(-50, 50), getRandom(-40, 40), 0],
        scale: [1, getRandom(1.1, 1.3), getRandom(0.9, 1.1), getRandom(1.05, 1.2), 1],
        rotate: [0, getRandom(-5, 5), getRandom(-10, 10), getRandom(-7, 7), 0],
        transition: { 
          duration: getRandom(10, 15), 
          ease: "easeInOut",
          times: [0, 0.25, 0.5, 0.75, 1]
        }
      },
      // Circular-like movement
      {
        y: [0, getRandom(-40, -100), getRandom(-100, -150), getRandom(-60, -120), 0],
        x: [0, getRandom(40, 80), getRandom(-30, 30), getRandom(-60, -100), 0],
        scale: [1, getRandom(1.2, 1.4), getRandom(1.1, 1.3), getRandom(0.9, 1.1), 1],
        rotate: [0, getRandom(8, 15), getRandom(-8, -15), getRandom(5, 10), 0],
        transition: { 
          duration: getRandom(12, 18), 
          ease: "easeInOut",
          times: [0, 0.3, 0.6, 0.8, 1]
        }
      },
      // Figure-8 inspired movement
      {
        y: [0, getRandom(-80, -120), 0, getRandom(-100, -160), 0],
        x: [0, getRandom(50, 90), getRandom(-50, -90), getRandom(30, 70), 0],
        scale: [1, getRandom(1.1, 1.2), getRandom(1.2, 1.4), getRandom(1.1, 1.3), 1],
        rotate: [0, getRandom(5, 15), getRandom(-5, -15), getRandom(10, 20), 0],
        transition: { 
          duration: getRandom(14, 20), 
          ease: "easeInOut",
          times: [0, 0.25, 0.5, 0.75, 1]
        }
      }
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  };

  // Function to start a new random animation for a specific control
  const startRandomAnimation = (control) => {
    const animation = generateRandomAnimation();
    control.start(animation).then(() => {
      // When animation completes, start a new one
      startRandomAnimation(control);
    });
  };

  // Start the animations with staggered timing
  useEffect(() => {
    const controls = [controls1, controls2, controls3, controls4, controls5];
    
    // Start each animation with a slight delay
    controls.forEach((control, index) => {
      setTimeout(() => {
        startRandomAnimation(control);
      }, index * 800); // Stagger start by 800ms
    });
    
    // Cleanup on unmount
    return () => {
      controls.forEach(control => control.stop());
    };
  }, []);

  // Map the controls to each image
  const controlsMap = [controls1, controls2, controls3, controls4, controls5];

  return (
    <div className="Home-hero-images">
      {foodImages.map((image, index) => (
        <motion.div
          key={image.id}
          className="Home-floating-image"
          id={`Home-floating-image-${image.id}`}
          animate={controlsMap[index]}
          initial={{ y: 0, x: 0, scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.2, rotate: 0, transition: { duration: 0.3 } }}
        >
          <img src={image.src} alt={image.alt} />
        </motion.div>
      ))}
    </div>
  );
};

export default DynamicFloatingImages;


// import React from "react";
// import { motion } from "framer-motion";
// import "./FloatingImage.css";

// const FloatingImage = ({ src, alt, id }) => {
//   return (
//     <motion.div
//       className="floating-image"
//       id={id}
//       initial={{ opacity: 0, x: -50, y: -50, scale: 0.5 }}
//       animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
//       transition={{
//         duration: 1.5,
//         ease: "easeInOut",
//         type: "spring",
//         stiffness: 80,
//       }}
//     >
//       <img src={src} alt={alt} />
//     </motion.div>
//   );
// };

// export default FloatingImage;
