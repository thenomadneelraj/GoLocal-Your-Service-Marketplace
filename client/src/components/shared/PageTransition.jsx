import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * PageTransition - Wrapper component for smooth page transitions
 * Provides fade-in and slide-up animation on route changes
 * 
 * @param {React.ReactNode} children - The page content to animate
 * @param {Object} variants - Custom animation variants (optional)
 */
const PageTransition = ({ children, variants }) => {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Default animation variants
  const defaultVariants = {
    initial: {
      opacity: 0,
      y: 20, // Slide up from 20px
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing for smooth feel
      },
    },
    exit: {
      opacity: 0,
      y: -10, // Slight slide up on exit
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const animationVariants = variants || defaultVariants;

  return (
    <motion.div
      key={location.pathname} // Re-trigger animation on route change
      initial="initial"
      animate="animate"
      exit="exit"
      variants={animationVariants}
      style={{
        width: "100%",
        minHeight: "100%",
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
