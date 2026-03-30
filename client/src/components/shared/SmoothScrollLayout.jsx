import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * SmoothScrollLayout - Main layout wrapper for smooth scrolling and page transitions
 * Handles:
 * - Global smooth scroll behavior
 * - Page transition animations
 * - Scroll restoration on route changes
 * - Overflow handling
 * 
 * @param {React.ReactNode} children - The routed content (Routes component)
 * @param {Object} transitionConfig - Custom transition configuration (optional)
 */
const SmoothScrollLayout = ({ children, transitionConfig }) => {
  const location = useLocation();
  const containerRef = useRef(null);

  // Default animation variants
  const defaultVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const animationVariants = transitionConfig || defaultVariants;

  // Ensure smooth scrolling is enabled globally
  useEffect(() => {
    // Apply smooth scroll to html element
    document.documentElement.style.scrollBehavior = "smooth";
    
    // Handle scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Cleanup
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // Handle scroll position on route change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Prevent layout shift by ensuring proper overflow handling
  useEffect(() => {
    const handleResize = () => {
      // Ensure body doesn't cause horizontal overflow
      document.body.style.overflowX = "hidden";
      document.body.style.width = "100%";
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        variants={animationVariants}
        style={{
          width: "100%",
          minHeight: "100%",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SmoothScrollLayout;
