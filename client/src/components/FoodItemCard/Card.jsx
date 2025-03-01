import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Card.css';

const Card = ({ uid, fid }) => {
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const fetchItemData = async () => {
      setLoading(true);
      try {
        // API endpoint that accepts both stall id (uid) and food id (fid)
        const response = await fetch(`/api/food-items?uid=${uid}&fid=${fid}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch item data');
        }
        
        const data = await response.json();
        setItemData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching item data:', error);
        setError('Could not load item data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItemData();
  }, [uid, fid]);
  
  // Star SVG component
  const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
        fill="#FFD700"
      />
    </svg>
  );
  
  if (loading) {
    return <div className="Card-container Card-loading">Loading...</div>;
  }
  
  if (error || !itemData) {
    return <div className="Card-container Card-error">{error || 'Error loading item'}</div>;
  }
  
  const { name, description, price, rating, photoURLs, stallName } = itemData;
  
  // Round rating to 2 decimal places
  const roundedRating = rating ? rating.toFixed(2) : "N/A";
  
  return (
    <motion.div 
      className="Card-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="Card-image-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {photoURLs && photoURLs.length > 0 && (
          <>
            <motion.img 
              src={photoURLs[0]} 
              alt={name}
              className="Card-image"
              initial={{ opacity: 1 }}
              animate={{ opacity: isHovered && photoURLs.length > 1 ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            />
            
            {photoURLs.length > 1 && (
              <motion.img 
                src={photoURLs[1]} 
                alt={`${name} - alternate view`}
                className="Card-image Card-image-hover"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </>
        )}
      </div>
      
      <div className="Card-content">
        <div className="Card-header">
          <motion.h3 
            className="Card-name"
            whileHover={{ scale: 1.03 }}
          >
            {name}
          </motion.h3>
          <div className="Card-rating">
            <StarIcon />
            <span>{roundedRating}</span>
          </div>
        </div>
        
        <div className="Card-stall">
          <p>{stallName}</p>
        </div>
        
        <p className="Card-description">{description}</p>
        
        <div className="Card-price-order">
          <p className="Card-price">${price.toFixed(2)}</p>
          <motion.button 
            className="Card-order-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Order Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;