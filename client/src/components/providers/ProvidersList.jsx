import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import Grid from "@mui/material/Grid";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Pagination,
  Container,
  Button,
  Skeleton,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ProviderCard from "./ProviderCard";

const LIMIT = 12;

const ProvidersList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [serviceType, setServiceType] = useState(
    searchParams.get("type") || "All"
  );
  const [location, setLocation] = useState(
    searchParams.get("location") || ""
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page")) || 1
  );
  const [totalPages, setTotalPages] = useState(1);

  const serviceTypes = useMemo(
    () => [
      "All",
      "Plumbing",
      "Electrical",
      "Cleaning",
      "Painting",
      "Carpentry",
      "AC Repair",
      "Appliance Repair",
      "Moving",
      "Other",
    ],
    []
  );

  /* ------------------------------
     Sync URL Params
  ------------------------------ */
  useEffect(() => {
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (serviceType !== "All") params.type = serviceType;
    if (location) params.location = location;
    if (page > 1) params.page = page;

    setSearchParams(params);
  }, [searchTerm, serviceType, location, page, setSearchParams]);

  /* ------------------------------
     Mock Data
  ------------------------------ */
  const getMockProviders = () => [
    {
      id: "1",
      name: "John Smith",
      serviceType: "Plumbing",
      rating: 4.8,
      reviewCount: 124,
      location: "New York, NY",
      hourlyRate: 75,
      bio: "Professional plumber with 10+ years experience.",
      available: true,
    },
    {
      id: "2",
      name: "Sarah Johnson",
      serviceType: "Electrical",
      rating: 4.9,
      reviewCount: 89,
      location: "Brooklyn, NY",
      hourlyRate: 85,
      bio: "Licensed electrician for homes and offices.",
      available: true,
    },
  ];

  /* ------------------------------
     Fetch Providers
  ------------------------------ */
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/providers", {
        params: {
          search: searchTerm,
          serviceType:
            serviceType !== "All" ? serviceType : undefined,
          location,
          page,
          limit: LIMIT,
        },
      });

      setProviders(response.data.providers || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error("API failed. Using mock data.");
      setProviders(getMockProviders());
      setTotalPages(1);
      setError("Server unavailable. Showing demo data.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, serviceType, location, page]);

  /* ------------------------------
     Debounce Search
  ------------------------------ */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProviders();
    }, 400);

    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box sx={{ bgcolor: "grey.100", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
<Typography
  variant="h3"
  fontWeight={700}
  gutterBottom
sx={{ color: "#9e9e9e" }}
>            Find Service Providers
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Connect with trusted professionals near you
          </Typography>
        </Box>

        {/* Search Section */}
        <Box
          sx={{
            mb: 5,
            p: 3,
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: 3,
          }}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search providers"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={serviceType}
                  label="Service Type"
                  onChange={(e) => {
                    setServiceType(e.target.value);
                    setPage(1);
                  }}
                >
                  {serviceTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ height: "56px" }}
                onClick={fetchProviders}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading ? (
          <Grid container spacing={3}>
            {Array.from(new Array(6)).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton
                  variant="rectangular"
                  height={220}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : providers.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography variant="h6">
              No providers found
            </Typography>
            <Typography color="text.secondary">
              Try adjusting your filters
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              mb={2}
            >
              Showing {providers.length} results
            </Typography>

            <Grid container spacing={3}>
              {providers.map((provider) => (
                <Grid
                  key={provider.id}
                  size={{ xs: 12, sm: 6, md: 4 }}
                >
                  <ProviderCard provider={provider} />
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box
                sx={{ display: "flex", justifyContent: "center", mt: 5 }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default ProvidersList;
