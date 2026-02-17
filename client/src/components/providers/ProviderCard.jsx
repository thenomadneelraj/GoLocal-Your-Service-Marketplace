import React from "react";
import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";

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
  } = provider;

  return (
    <Card
      sx={{
        maxWidth: 345,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      <CardMedia
        component="div"
        sx={{
          height: 200,
          backgroundColor: "grey.300",
          backgroundImage: image ? `url(${image})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!image && <PersonIcon sx={{ fontSize: 80, color: "grey.500" }} />}
      </CardMedia>

      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Typography
            gutterBottom
            variant="h6"
            component="div"
            sx={{ fontWeight: 600 }}
          >
            {name || "Provider Name"}
          </Typography>
          {available && (
            <Chip
              label="Available"
              color="success"
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
        </Box>

        <Chip
          label={serviceType || "Service"}
          color="primary"
          size="small"
          sx={{ mb: 1 }}
        />

        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Rating value={rating} precision={0.5} readOnly size="small" />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({reviewCount} reviews)
          </Typography>
        </Box>

        {location && (
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <LocationOnIcon
              sx={{ fontSize: 16, color: "text.secondary", mr: 0.5 }}
            />
            <Typography variant="body2" color="text.secondary">
              {location}
            </Typography>
          </Box>
        )}

        {bio && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {bio}
          </Typography>
        )}

        {hourlyRate && (
          <Typography
            variant="h6"
            color="primary"
            sx={{ mt: 1, fontWeight: 600 }}
          >
            ${hourlyRate}/hr
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          component={Link}
          to={`/providers/${id}`}
          variant="outlined"
          fullWidth
        >
          View Profile
        </Button>
        <Button
          component={Link}
          to={`/booking/${id}`}
          variant="contained"
          fullWidth
        >
          Book Now
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProviderCard;
