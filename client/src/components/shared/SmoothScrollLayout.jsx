import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const WORKSPACE_PATH_PATTERN =
  /^\/(?:dashboard|settings|help-support|client(?:\/|$)|provider(?:-dashboard|\/|$)|admin(?:\/|$)|booking(?:\/|$)|bookings(?:\/|$))/;

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
  const isWorkspaceRoute = useMemo(
    () => WORKSPACE_PATH_PATTERN.test(location.pathname),
    [location.pathname]
  );

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

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = isWorkspaceRoute
      ? "auto"
      : "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, [isWorkspaceRoute]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const shellScroller = document.querySelector("[data-shell-scroll]");

      if (shellScroller instanceof HTMLElement) {
        shellScroller.scrollTo({
          top: 0,
          left: 0,
          behavior: isWorkspaceRoute ? "auto" : "smooth",
        });
        return;
      }

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: isWorkspaceRoute ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isWorkspaceRoute, location.pathname]);

  useEffect(() => {
    const handleResize = () => {
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
      {isWorkspaceRoute ? (
        <div
          style={{
            width: "100%",
            minHeight: "100%",
          }}
        >
          {children}
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default SmoothScrollLayout;
