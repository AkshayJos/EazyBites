import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useScrollNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a scroll target in the state
    if (location.state?.scrollTo) {
      setTimeout(() => {
        const element = document.getElementById(location.state.scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100); // Small delay to ensure component is mounted
    }
  }, [location]);

  const navigateAndScroll = (path, elementId) => {
    if (location.pathname === path) {
      // If we're already on the target page, just scroll
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to the page with scroll target in state
      navigate(path, { state: { scrollTo: elementId } });
    }
  };

  return { navigateAndScroll };
};