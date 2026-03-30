import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/components/contexts/AuthContext";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkIcon from "@mui/icons-material/Work";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { resolveMediaUrl } from "@/lib/media";

const STATUS_CONFIG = {
  available: { label: "Available", color: "success" },
  busy: { label: "Busy", color: "warning" },
  unavailable: { label: "Unavailable", color: "default" },
};

const formatReviewDate = (value) => {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (value = "") =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProvider();
  }, [id]);

  const fetchProvider = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/providers/${id}`);
      const raw = response.data?.data || response.data;
      const normalized = {
        ...raw,
        id: raw?._id || raw?.id,
        name: raw?.name || "Unknown",
        email: raw?.email || raw?.user?.email,
        profileImage: raw?.profileImage || raw?.profilePhoto || "",
        rating: Number(raw?.rating || 0),
        available: raw?.available ?? raw?.availability ?? false,
        userAccountId: raw?.userId?._id || raw?.userId || "",
        verified: raw?.verified ?? raw?.isApproved ?? false,
        reviewCount: raw?.reviewCount ?? raw?.totalReviews ?? 0,
        yearsExperience: raw?.yearsExperience ?? raw?.experience ?? 0,
        responseTime: raw?.responseTime || "Within 24 hours",
        completedJobs: raw?.completedJobs || 0,
        services: Array.isArray(raw?.services) ? raw.services : [],
        reviews: Array.isArray(raw?.reviews)
          ? raw.reviews.map((review) => ({
              id: review?.id || review?._id,
              rating: Number(review?.rating || 0),
              comment: review?.comment || "",
              createdAt: review?.createdAt || review?.date || "",
              serviceTitle: review?.serviceTitle || "",
              clientName:
                review?.clientName ||
                review?.userName ||
                review?.clientId?.name ||
                "Client",
              clientProfileImage:
                review?.clientProfileImage ||
                review?.clientId?.profileImage ||
                "",
            }))
          : [],
        availabilitySummary: raw?.availabilitySummary || {
          status: raw?.available ?? raw?.availability ? "available" : "unavailable",
          reason: raw?.available ?? raw?.availability ? "Provider is available for booking." : "Provider is currently unavailable.",
          canBook: Boolean(raw?.available ?? raw?.availability),
        },
      };
      setProvider(normalized);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load provider details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate("/providers")} sx={{ mt: 2 }}>
          Back to Providers
        </Button>
      </Container>
    );
  }

  if (!provider) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Provider not found</Alert>
        <Button onClick={() => navigate("/providers")} sx={{ mt: 2 }}>
          Back to Providers
        </Button>
      </Container>
    );
  }

  const profileImage = resolveMediaUrl(provider.profileImage);
  const fallbackServiceLabel =
    provider.serviceType && provider.serviceType !== "Other"
      ? `${provider.serviceType} Service`
      : "General Service";
  const displayedServices = provider.services?.length
    ? provider.services
    : [{ _id: "default-service", title: fallbackServiceLabel }];
  const statusConfig =
    STATUS_CONFIG[provider.availabilitySummary?.status] || STATUS_CONFIG.available;
  const bookingButtonLabel =
    provider.availabilitySummary?.status === "busy"
      ? "Choose Date & Time"
      : provider.availabilitySummary?.status === "unavailable"
        ? "Unavailable for Booking"
        : "Book Now";
  const currentUserRole = String(user?.role || "").toLowerCase();
  const isOwnProviderProfile =
    currentUserRole === "provider" &&
    String(user?.id || "") === String(provider.userAccountId || "");
  const canMessageProvider =
    Boolean(provider.userAccountId) &&
    (!user || currentUserRole === "client" || isOwnProviderProfile);
  const messageButtonLabel = !user
    ? "Sign In to Message"
    : currentUserRole === "client"
      ? "Send Message"
      : isOwnProviderProfile
        ? "Open Inbox"
        : "Client Messaging Only";

  const handleMessageClick = () => {
    if (!provider.userAccountId) return;

    if (!user) {
      navigate("/signin", {
        state: {
          message: "Sign in as a client to message this provider.",
          redirectTo: `/messages?contact=${provider.userAccountId}`,
          preferredRole: "CLIENT",
        },
      });
      return;
    }

    if (currentUserRole === "client") {
      navigate(`/messages?contact=${provider.userAccountId}`);
      return;
    }

    if (isOwnProviderProfile) {
      navigate("/provider/messages");
    }
  };

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Back Button */}
        <Button
          component={Link}
          to="/providers"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Back to Providers
        </Button>

        <Grid container spacing={4}>
          {/* Left Column - Provider Info */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Profile Header Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 3,
                    alignItems: "flex-start",
                  }}
                >
                  <Avatar
                    src={profileImage || undefined}
                    sx={{
                      width: 120,
                      height: 120,
                      fontSize: "3rem",
                      bgcolor: "primary.main",
                    }}
                  >
                    {provider.name?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{ fontWeight: 700 }}
                      >
                        {provider.name}
                      </Typography>
                      {provider.verified && (
                        <Chip
                          icon={<VerifiedIcon />}
                          label="Verified"
                          color="primary"
                          size="small"
                        />
                      )}
                      <Chip
                        label={statusConfig.label}
                        color={statusConfig.color}
                        size="small"
                      />
                    </Box>

                    <Chip
                      label={provider.serviceType}
                      color="primary"
                      sx={{ mb: 2 }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Rating
                          value={Number(provider.rating || 0)}
                          precision={0.5}
                          readOnly
                        />
                        <Typography variant="body1" sx={{ ml: 1 }}>
                          {Number(provider.rating || 0).toFixed(1)} ({provider.reviewCount} reviews)
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                        color: "text.secondary",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <LocationOnIcon sx={{ mr: 0.5 }} />
                        <Typography>{provider.location}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <WorkIcon sx={{ mr: 0.5 }} />
                        <Typography>
                          {provider.yearsExperience} years experience
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  About
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ lineHeight: 1.8 }}
                >
                  {provider.bio}
                </Typography>
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Services Offered
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {displayedServices.map((service, index) => (
                    <Chip
                      key={service?._id || index}
                      label={typeof service === "string" ? service : service.title}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Certifications */}
            {provider.certifications && provider.certifications.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    Certifications & Licenses
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {provider.certifications.map((cert, index) => (
                      <Chip
                        key={index}
                        icon={<VerifiedIcon />}
                        label={cert}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Reviews
                </Typography>
                {provider.reviews?.length ? (
                  provider.reviews.map((review, index) => (
                    <Box key={review.id || index}>
                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "flex-start",
                          }}
                        >
                          <Avatar
                            src={resolveMediaUrl(review.clientProfileImage) || undefined}
                            sx={{ width: 52, height: 52, bgcolor: "primary.main" }}
                          >
                            {getInitials(review.clientName)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 2,
                                mb: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box>
                                <Typography
                                  variant="subtitle1"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {review.clientName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {review.serviceTitle || provider.serviceType}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatReviewDate(review.createdAt)}
                              </Typography>
                            </Box>
                            <Rating value={Number(review.rating || 0)} readOnly size="small" />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1.25, lineHeight: 1.7 }}
                            >
                              {review.comment || "This client left a star rating without a written comment."}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      {index < provider.reviews.length - 1 && (
                        <Divider sx={{ my: 2 }} />
                      )}
                    </Box>
                  ))
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No client feedback yet. Completed booking reviews will appear here with the client&apos;s name and profile photo.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Booking Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: "sticky", top: 100 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Book This Provider
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h4"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  >
                    ${provider.hourlyRate}
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                    >
                      /hour
                    </Typography>
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{provider.phone}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">{provider.email}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Response: {provider.responseTime}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Alert
                  severity={
                    provider.availabilitySummary?.status === "available"
                      ? "success"
                      : provider.availabilitySummary?.status === "busy"
                        ? "warning"
                        : "info"
                  }
                  sx={{ mb: 3 }}
                >
                  {provider.availabilitySummary?.reason || "Provider availability will be checked when you book."}
                </Alert>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose your preferred calendar date and time after continuing to the booking step.
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Jobs Completed
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {provider.completedJobs}+
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  component={Link}
                  to={`/booking/${provider.id}`}
                  sx={{ mb: 2 }}
                  disabled={provider.availabilitySummary?.status === "unavailable"}
                >
                  {bookingButtonLabel}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleMessageClick}
                  disabled={!canMessageProvider}
                >
                  {messageButtonLabel}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ProviderProfile;
