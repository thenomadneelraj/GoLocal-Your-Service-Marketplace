import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import ForgotPassword from "../pages/SignIn/Components/ForgotPassword";
import AppTheme from "../shared/AppTheme";
import ThemeToggle from "../shared/ThemeToggle";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import { getAccountAccessState, getDashboardPathByRole } from "@/lib/accountAccess";
import {
  GoogleIcon,
  FacebookIcon,
  SitemarkIcon,
} from "../pages/SignIn/Components/CustomIconsSI";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  minHeight: "100dvh", // Use dynamic viewport height
  padding: theme.spacing(2),
  paddingBottom: theme.spacing(4), // Add bottom padding for scroll
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
    paddingBottom: theme.spacing(6),
  },
  position: "relative",
  width: "100%",
  /* Remove overflowY: auto - let body handle scrolling */
  "&::before": {
    content: '""',
    display: "block",
    position: "fixed", // Changed from absolute to fixed
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function SignIn(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { maintenanceMode, platformName } = useMaintenance();
  const redirectTo = location.state?.redirectTo || location.state?.from || "";
  const searchQuery = location.state?.searchQuery || "";
  const redirectedMessage = location.state?.message || "";
  const preferredRole = location.state?.preferredRole || "CLIENT";

  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(preferredRole);

  useEffect(() => {
    setSelectedRole(preferredRole);
  }, [preferredRole]);

  useEffect(() => {
    if (maintenanceMode && selectedRole !== "ADMIN") {
      setSelectedRole("ADMIN");
    }
  }, [maintenanceMode, selectedRole]);

  useEffect(() => {
    if (!user) return;

    const normalizedRole = String(user.role || "").toUpperCase();
    const accountAccess = getAccountAccessState(user);
    const finalTarget = searchQuery 
      ? `/providers?search=${encodeURIComponent(searchQuery)}` 
      : redirectTo;

    if (accountAccess.restricted) {
      navigate(getDashboardPathByRole(normalizedRole), { replace: true });
      return;
    }

    if (finalTarget) {
      navigate(finalTarget, { replace: true });
      return;
    }

    if (normalizedRole === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
    } else if (normalizedRole === "PROVIDER") {
      navigate("/provider-dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, redirectTo, searchQuery]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validateInputs()) return;

    const data = new FormData(event.currentTarget);

    const payload = {
      email: data.get("email"),
      password: data.get("password"),
      role: selectedRole,
    };

    setLoading(true);
    const result = await login(payload.email, payload.password, payload.role);
    setLoading(false);

    if (result.success) {
      const loggedInRole = String(result.user?.role || "").toUpperCase();
      const accountAccess = getAccountAccessState(result.user);

      const finalTarget = searchQuery 
        ? `/providers?search=${encodeURIComponent(searchQuery)}` 
        : redirectTo;

      if (accountAccess.restricted) {
        navigate(getDashboardPathByRole(loggedInRole), { replace: true });
        return;
      }

      if (finalTarget) {
        navigate(finalTarget, { replace: true });
        return;
      }

      if (loggedInRole === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
      } else if (loggedInRole === "PROVIDER") {
        navigate("/provider-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      setError(
        result.message || "Login failed. Please check your credentials.",
      );
    }
  };

  const validateInputs = () => {
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ThemeToggle />
      <SignInContainer direction="column" justifyContent="flex-start">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {!error && redirectedMessage ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {redirectedMessage}
              </Alert>
            ) : null}

            {maintenanceMode ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {platformName} is currently in maintenance mode. Only admin sign-in is available right now.
              </Alert>
            ) : null}

            <FormControl fullWidth>
              <FormLabel>Sign in as</FormLabel>
              <TextField
                select
                name="role"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                slotProps={{
                  select: {
                    native: true,
                  },
                }}
              >
                <option value="CLIENT" disabled={maintenanceMode}>Client</option>
                <option value="PROVIDER" disabled={maintenanceMode}>Service Provider</option>
                <option value="ADMIN">Admin</option>
              </TextField>
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={passwordError ? "error" : "primary"}
              />
            </FormControl>
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <ForgotPassword open={open} handleClose={handleClose} />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Sign in"}
            </Button>
            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{ alignSelf: "center" }}
            >
              Forgot your password?
            </Link>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => alert("Sign in with Google")}
              startIcon={<GoogleIcon />}
            >
              Sign in with Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => alert("Sign in with Facebook")}
              startIcon={<FacebookIcon />}
            >
              Sign in with Facebook
            </Button>
            <Typography sx={{ textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <Link
                component={RouterLink}
                to="/signup"
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
