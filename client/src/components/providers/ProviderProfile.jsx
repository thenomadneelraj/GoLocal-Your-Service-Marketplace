import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
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
import TextField from "@mui/material/TextField";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkIcon from "@mui/icons-material/Work";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      const response = await axios.get(`/api/providers/${id}`);
      setProvider(response.data);
    } catch (err) {
      console.log("Using mock data for provider");
      setProvider(getMockProvider());
    } finally {
      setLoading(false);
    }
  };

  const getMockProvider = () => {
    return {
      id: "1",
      name: "John Smith",
      serviceType: "Plumbing",
      rating: 4.8,
      reviewCount: 124,
      location: "New York, NY",
      hourlyRate: 75,
      bio: "Professional plumber with over 10 years of experience in residential and commercial plumbing services. I specialize in pipe repair, water heater installation, drain cleaning, and emergency plumbing services. My commitment to quality workmanship and customer satisfaction has earned me a reputation as one of the most reliable plumbers in the area.",
      available: true,
      verified: true,
      phone: "(555) 123-4567",
      email: "john.smith@email.com",
      yearsExperience: 10,
      completedJobs: 500,
      responseTime: "Within 1 hour",
      reviews: [
        {
          id: 1,
          userName: "Alice M.",
          rating: 5,
          date: "2024-01-15",
          comment:
            "Excellent work! Fixed our leak quickly and professionally. Highly recommend!",
        },
        {
          id: 2,
          userName: "Bob K.",
          rating: 5,
          date: "2024-01-10",
          comment: "Very knowledgeable and efficient. Fair pricing too.",
        },
        {
          id: 3,
          userName: "Carol D.",
          rating: 4,
          date: "2024-01-05",
          comment: "Good work, arrived on time. Would hire again.",
        },
      ],
      services: [
        "Pipe Repair & Installation",
        "Water Heater Services",
        "Drain Cleaning",
        "Emergency Plumbing",
        "Leak Detection",
        "Bathroom & Kitchen Plumbing",
      ],
      certifications: [
        "Licensed Plumber",
        "Certified Backflow Tester",
        "OSHA Safety Certified",
      ],
    };
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
          <Grid item xs={12} md={8}>
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
                      {provider.available && (
                        <Chip label="Available" color="success" size="small" />
                      )}
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
                          value={provider.rating}
                          precision={0.5}
                          readOnly
                        />
                        <Typography variant="body1" sx={{ ml: 1 }}>
                          {provider.rating} ({provider.reviewCount} reviews)
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
                  {provider.services?.map((service, index) => (
                    <Chip key={index} label={service} variant="outlined" />
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
                {provider.reviews?.map((review, index) => (
                  <Box key={review.id}>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          {review.userName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {review.date}
                        </Typography>
                      </Box>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {review.comment}
                      </Typography>
                    </Box>
                    {index < provider.reviews.length - 1 && (
                      <Divider sx={{ my: 2 }} />
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Booking Card */}
          <Grid item xs={12} md={4}>
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
                >
                  Book Now
                </Button>

                <Button variant="outlined" fullWidth size="large">
                  Send Message
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
