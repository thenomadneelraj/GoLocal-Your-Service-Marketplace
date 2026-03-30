import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import { alpha } from "@mui/material/styles";
import { resolveMediaUrl } from "@/lib/media";

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const getInitials = (value) =>
  (value || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const ProviderCard = ({ provider }) => {
  const {
    id,
    name,
    serviceType,
    rating = 0,
    reviewCount = 0,
    location,
    image,
    hourlyRate,
    bio,
    available,
    experience = 0,
    serviceCount = 0,
  } = provider;

  const imageUrl = resolveMediaUrl(image);

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 5,
        overflow: "hidden",
        border: "1px solid",
        borderColor: alpha("#0f172a", 0.08),
        boxShadow: "0 24px 60px -34px rgba(15,23,42,0.35)",
        transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 34px 80px -34px rgba(37,99,235,0.35)",
          borderColor: alpha("#2563eb", 0.24),
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          minHeight: 220,
          px: 2.5,
          py: 2.25,
          display: "flex",
          alignItems: "flex-end",
          background: imageUrl
            ? `linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.72) 100%), url(${imageUrl})`
            : "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 36%, #93c5fd 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 18, left: 18, right: 18, justifyContent: "space-between" }}
        >
          <Chip
            label={available ? "Available now" : "Busy"}
            color={available ? "success" : "default"}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: available ? alpha("#16a34a", 0.92) : alpha("#0f172a", 0.72),
              color: "white",
            }}
          />
          <Chip
            label={serviceType || "Service"}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: alpha("#ffffff", 0.88),
              color: "#1e3a8a",
            }}
          />
        </Stack>

        {!imageUrl ? (
          <Avatar
            sx={{
              width: 86,
              height: 86,
              mb: 1,
              border: "4px solid rgba(255,255,255,0.55)",
              bgcolor: alpha("#eff6ff", 0.96),
              color: "#1d4ed8",
              fontSize: "1.7rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            {getInitials(name)}
          </Avatar>
        ) : null}
      </Box>

      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
              {name || "Provider Name"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {serviceType || "General service provider"}
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              borderRadius: 3,
              bgcolor: alpha("#2563eb", 0.08),
              color: "#1d4ed8",
              textAlign: "right",
            }}
          >
            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Starting
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {formatCurrency(hourlyRate)}/hr
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
          <Rating value={Number(rating || 0)} precision={0.5} readOnly size="small" />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {Number(rating || 0).toFixed(1)} ({reviewCount} reviews)
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Chip
            icon={<LocationOnIcon sx={{ fontSize: 18 }} />}
            label={location || "Location not set"}
            variant="outlined"
            sx={{ borderRadius: 999, maxWidth: "100%" }}
          />
          <Chip
            icon={<WorkOutlineRoundedIcon sx={{ fontSize: 18 }} />}
            label={`${experience} yrs exp`}
            variant="outlined"
            sx={{ borderRadius: 999 }}
          />
          <Chip
            icon={<BoltRoundedIcon sx={{ fontSize: 18 }} />}
            label={`${serviceCount} services`}
            variant="outlined"
            sx={{ borderRadius: 999 }}
          />
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 2,
            minHeight: 44,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {bio || "Browse this provider to explore detailed services, pricing, availability, and client feedback."}
        </Typography>
      </CardContent>

      <CardActions sx={{ p: 2.5, pt: 0, gap: 1.25 }}>
        <Button
          component={Link}
          to={`/providers/${id}`}
          variant="outlined"
          fullWidth
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          View Profile
        </Button>
        <Button
          component={Link}
          to={`/booking/${id}`}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 999,
            fontWeight: 700,
            boxShadow: "0 14px 32px -18px rgba(37,99,235,0.8)",
          }}
        >
          Book Now
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProviderCard;
