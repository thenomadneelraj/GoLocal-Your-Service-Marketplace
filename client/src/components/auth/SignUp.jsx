import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { Camera, Plus } from "lucide-react";
import AppTheme from "../shared/AppTheme";
import ThemeToggle from "../shared/ThemeToggle";
import {
  GoogleIcon,
  FacebookIcon,
  SitemarkIcon,
} from "../pages/SignUp/Components/CustomIconsSU";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  [theme.breakpoints.up("sm")]: {
    width: "450px",
  },
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
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

const SERVICE_CATEGORY_OPTIONS = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Painting",
  "Carpentry",
  "AC Repair",
  "Appliance Repair",
  "Moving",
  "Other",
];

export default function SignUp(props) {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState("");
  const [nameError, setNameError] = useState(false);
  const [nameErrorMessage, setNameErrorMessage] = useState("");
  const [workCategoriesError, setWorkCategoriesError] = useState(false);
  const [workCategoriesErrorMessage, setWorkCategoriesErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [serviceType, setServiceType] = useState("Other");
  const [workCategories, setWorkCategories] = useState(["Other"]);

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateInputs = () => {
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const name = document.getElementById("name");
    const phone = document.getElementById("phone");

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (
      !password.value ||
      password.value.length < 8 ||
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password.value)
    ) {
      setPasswordError(true);
      setPasswordErrorMessage(
        "Password must be 8+ chars and include uppercase, lowercase, and a number.",
      );
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    if (!name.value || name.value.length < 1) {
      setNameError(true);
      setNameErrorMessage("Name is required.");
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage("");
    }

    if (!phone.value || !/^\d{10}$/.test(phone.value)) {
      setPhoneError(true);
      setPhoneErrorMessage("Phone number must be exactly 10 digits.");
      isValid = false;
    } else {
      setPhoneError(false);
      setPhoneErrorMessage("");
    }

    if (role === "PROVIDER" && !workCategories.length) {
      setWorkCategoriesError(true);
      setWorkCategoriesErrorMessage("Select at least one work category.");
      isValid = false;
    } else {
      setWorkCategoriesError(false);
      setWorkCategoriesErrorMessage("");
    }

    return isValid;
  };

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    setRole(nextRole);

    if (nextRole === "PROVIDER") {
      setWorkCategories((current) =>
        current.length ? current : [serviceType || "Other"]
      );
      return;
    }

    setWorkCategoriesError(false);
    setWorkCategoriesErrorMessage("");
  };

  const handleServiceTypeChange = (event) => {
    const nextServiceType = event.target.value;
    setServiceType(nextServiceType);
    setWorkCategories((current) =>
      Array.from(
        new Set([nextServiceType, ...(Array.isArray(current) ? current : [])].filter(Boolean))
      )
    );
  };

  const handleWorkCategoriesChange = (event) => {
    const rawValue = event.target.value;
    const nextCategories =
      typeof rawValue === "string" ? rawValue.split(",") : rawValue;
    const normalizedCategories = Array.from(
      new Set(
        (Array.isArray(nextCategories) ? nextCategories : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );

    setWorkCategories(normalizedCategories);

    if (!normalizedCategories.length) {
      setWorkCategoriesError(true);
      setWorkCategoriesErrorMessage("Select at least one work category.");
      return;
    }

    if (!normalizedCategories.includes(serviceType)) {
      setServiceType(normalizedCategories[0]);
    }

    setWorkCategoriesError(false);
    setWorkCategoriesErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateInputs()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const name = data.get("name");
    const email = data.get("email");
    const phone = data.get("phone");
    const password = data.get("password");
    const submittedWorkCategories =
      role === "PROVIDER"
        ? Array.from(new Set([serviceType, ...workCategories].filter(Boolean)))
        : [];

    if (role === "PROVIDER" && !submittedWorkCategories.length) {
      setWorkCategoriesError(true);
      setWorkCategoriesErrorMessage("Select at least one work category.");
      return;
    }

    setLoading(true);
    const result = await register(
      name,
      email,
      phone,
      password,
      role,
      profilePhoto,
      serviceType,
      submittedWorkCategories
    );
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      const registeredRole = result.user?.role;

      if (registeredRole === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (registeredRole === "PROVIDER") {
        navigate("/provider-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      setError(result.message || "Registration failed. Please try again.");
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ThemeToggle />
      <SignUpContainer direction="column" justifyContent="flex-start">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            Sign up
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Registration successful! Redirecting...
              </Alert>
            )}

            <FormControl>
              <FormLabel>Profile Photo</FormLabel>
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <Box sx={{ position: "relative", width: 96, height: 96 }}>
                  <Box
                    sx={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="profile preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Camera size={28} color="#64748b" />
                    )}
                  </Box>
                  <Button
                    component="label"
                    variant="contained"
                    sx={{
                      minWidth: 0,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      position: "absolute",
                      right: -4,
                      bottom: -4,
                      p: 0,
                    }}
                  >
                    <Plus size={16} />
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={handleProfilePhotoChange}
                    />
                  </Button>
                </Box>
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="name">Full name</FormLabel>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                placeholder="Jon Snow"
                error={nameError}
                helperText={nameErrorMessage}
                color={nameError ? "error" : "primary"}
              />
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="role">Account Type</FormLabel>
              <TextField
                select
                name="role"
                value={role}
                onChange={handleRoleChange}
                slotProps={{
                  select: {
                    native: true,
                  },
                }}
              >
                <option value="CLIENT">Client</option>
                <option value="PROVIDER">Service Provider</option>
              </TextField>
            </FormControl>

            {role === "PROVIDER" && (
              <FormControl>
                <FormLabel htmlFor="serviceType">Profession / Service Type</FormLabel>
                <TextField
                  select
                  name="serviceType"
                  value={serviceType}
                  onChange={handleServiceTypeChange}
                  slotProps={{
                    select: {
                      native: true,
                    },
                  }}
                >
                  {SERVICE_CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </TextField>
              </FormControl>
            )}

            {role === "PROVIDER" && (
              <FormControl error={workCategoriesError}>
                <InputLabel id="work-categories-label">Work Categories</InputLabel>
                <Select
                  labelId="work-categories-label"
                  multiple
                  value={workCategories}
                  onChange={handleWorkCategoriesChange}
                  input={<OutlinedInput label="Work Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {SERVICE_CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                {workCategoriesErrorMessage ? (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {workCategoriesErrorMessage}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ mt: 1, color: "text.secondary" }}>
                    Select one or more work categories. The primary service type will stay in sync.
                  </Typography>
                )}
              </FormControl>
            )}

            <FormControl>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                required
                fullWidth
                id="email"
                placeholder="your@email.com"
                name="email"
                autoComplete="email"
                variant="outlined"
                error={emailError}
                helperText={emailErrorMessage}
                color={emailError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="phone">Phone Number</FormLabel>
              <TextField
                required
                fullWidth
                id="phone"
                placeholder="9876543210"
                name="phone"
                autoComplete="tel"
                variant="outlined"
                error={phoneError}
                helperText={phoneErrorMessage}
                color={phoneError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                required
                fullWidth
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="new-password"
                variant="outlined"
                error={passwordError}
                helperText={passwordErrorMessage}
                color={passwordError ? "error" : "primary"}
              />
            </FormControl>
            <FormControlLabel
              control={<Checkbox value="allowExtraEmails" color="primary" />}
              label="I want to receive updates via email."
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              onClick={validateInputs}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Sign up"}
            </Button>
          </Box>
          <Divider>
            <Typography sx={{ color: "text.secondary" }}>or</Typography>
          </Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => alert("Sign up with Google")}
              startIcon={<GoogleIcon />}
            >
              Sign up with Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => alert("Sign up with Facebook")}
              startIcon={<FacebookIcon />}
            >
              Sign up with Facebook
            </Button>
            <Typography sx={{ textAlign: "center" }}>
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/signin"
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignUpContainer>
    </AppTheme>
  );
}
