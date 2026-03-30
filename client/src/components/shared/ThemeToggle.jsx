import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/contexts/ThemeContext";
import { useColorScheme } from "@mui/material/styles";

export default function ThemeToggle({ sx = {} }) {
  const { theme, toggleTheme } = useTheme();
  const { setMode } = useColorScheme();
  const isDark = theme === "dark";

  const handleToggle = () => {
    // Update both our custom ThemeContext and MUI's color scheme
    const newTheme = isDark ? "light" : "dark";
    toggleTheme();
    setMode(newTheme);
  };

  return (
    <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        onClick={handleToggle}
        sx={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 9999,
          backgroundColor: "background.paper",
          boxShadow: 2,
          "&:hover": {
            backgroundColor: "action.hover",
          },
          transition: "all 0.3s ease",
          ...sx,
        }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun size={20} color="#f59e0b" />
        ) : (
          <Moon size={20} color="#6366f1" />
        )}
      </IconButton>
    </Tooltip>
  );
}
