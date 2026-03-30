import { useMemo } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * AnimatedRoutes - Wrapper for React Router routes with smooth transitions
 * Uses useRoutes hook for better control over route transitions
 * 
 * @param {Array} routes - Array of route objects compatible with useRoutes
 * @param {Object} transitionConfig - Custom transition configuration (optional)
 */
const AnimatedRoutes = ({ routes, transitionConfig }) => {
  const location = useLocation();
  const element = useRoutes(routes, location);

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
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const animationVariants = transitionConfig || defaultVariants;

  if (!element) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={animationVariants}
        style={{
          width: "100%",
          minHeight: "100%",
        }}
      >
        {element}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
