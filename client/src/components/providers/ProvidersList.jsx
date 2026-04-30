import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";

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
  Paper,
  Chip,
  Stack,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SortRoundedIcon from "@mui/icons-material/SortRounded";
import ProviderCard from "./ProviderCard";

const LIMIT = 12;

const normalizeCategoryTags = (categories = [], fallback = "") => {
  const values = Array.isArray(categories) ? categories : [];
  const unique = Array.from(
    new Set(
      values
        .map((category) => String(category || "").trim())
        .filter(Boolean)
    )
  );
  const withoutOther = unique.filter(
    (category) => category.toLowerCase() !== "other"
  );
  if (withoutOther.length) return withoutOther;
  return fallback && String(fallback).toLowerCase() !== "other"
    ? [String(fallback)]
    : [];
};

const normalizeProvider = (item) => ({
  id: item._id || item.id,
  name: item.name || "Unknown",
  serviceType: item.serviceType || "Other",
  rating: Number(item.rating || 0),
  reviewCount: Number(item.reviewCount ?? item.totalReviews ?? 0),
  location: item.location || "",
  hourlyRate: Number(item.hourlyRate || 0),
  bio: item.bio || "",
  available: item.available ?? item.availability ?? false,
  image: item.profileImage || item.profilePhoto || item.image || "",
  experience: Number(item.experience ?? item.yearsExperience ?? 0),
  serviceCount:
    item.serviceCount ??
    (Array.isArray(item.services) ? item.services.length : 0),
  servicePriceRange: item.servicePriceRange || null,
  availabilitySchedule: Array.isArray(item.availabilitySchedule)
    ? item.availabilitySchedule
    : [],
  workCategories: normalizeCategoryTags(item.workCategories, item.serviceType),
  isMock: Boolean(item.isMock),
});

const ProvidersList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [serviceType, setServiceType] = useState(
    searchParams.get("type") || "All",
  );
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "recommended",
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page"), 10) || 1);
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
    [],
  );

  useEffect(() => {
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (serviceType !== "All") params.type = serviceType;
    if (location) params.location = location;
    if (sortBy !== "recommended") params.sort = sortBy;
    if (page > 1) params.page = page;

    const next = new URLSearchParams(params).toString();
    const current = searchParams.toString();

    if (next !== current) {
      setSearchParams(params, { replace: true });
    }
  }, [
    searchTerm,
    serviceType,
    location,
    sortBy,
    page,
    searchParams,
    setSearchParams,
  ]);

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
      experience: 10,
      serviceCount: 6,
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
      experience: 8,
      serviceCount: 4,
    },
  ];

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use our enhanced API wrapper that supports mock mode
      const response = await api.get("providers", {
        params: {
          search: searchTerm || undefined,
          serviceType: serviceType !== "All" ? serviceType : undefined,
          location: location || undefined,
          page,
          limit: LIMIT,
        },
      });

      const raw =
        response.data?.providers ||
        response.data?.data?.providers ||
        response.data?.data ||
        response.data ||
        [];

      const normalized = Array.isArray(raw) ? raw.map(normalizeProvider) : [];

      setProviders(normalized);
      setTotalPages(
        response.data?.totalPages ||
          Math.max(1, Math.ceil(normalized.length / LIMIT)) ||
          1,
      );
      setTotalResults(response.data?.total || normalized.length);

      // If using mock API, show a subtle indicator
      if (api.useMock) {
        console.log("🔧 Using mock API data for providers");
      }
    } catch (err) {
      console.error("Failed to fetch providers:", err);
      const mockProviders = getMockProviders();
      setProviders(mockProviders);
      setTotalPages(1);
      setTotalResults(mockProviders.length);
      setError("Failed to load providers. Showing demo data.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, serviceType, location, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProviders();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProviders]);

  const displayedProviders = useMemo(() => {
    const items = [...providers];

    switch (sortBy) {
      case "rating":
        return items.sort(
          (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
        );
      case "price-low":
        return items.sort((a, b) => a.hourlyRate - b.hourlyRate);
      case "price-high":
        return items.sort((a, b) => b.hourlyRate - a.hourlyRate);
      case "experience":
        return items.sort((a, b) => b.experience - a.experience);
      default:
        return items.sort(
          (a, b) =>
            Number(b.available) - Number(a.available) ||
            b.rating - a.rating ||
            b.reviewCount - a.reviewCount,
        );
    }
  }, [providers, sortBy]);

  const availableCount = useMemo(
    () => displayedProviders.filter((provider) => provider.available).length,
    [displayedProviders],
  );

  const averageRate = useMemo(() => {
    if (!displayedProviders.length) {
      return 0;
    }

    const totalRate = displayedProviders.reduce(
      (sum, provider) => sum + Number(provider.hourlyRate || 0),
      0,
    );

    return Math.round(totalRate / displayedProviders.length);
  }, [displayedProviders]);

  const activeFiltersCount = useMemo(
    () =>
      [Boolean(searchTerm), serviceType !== "All", Boolean(location)].filter(
        Boolean,
      ).length,
    [searchTerm, serviceType, location],
  );

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleManualSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchProviders();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setServiceType("All");
    setLocation("");
    setSortBy("recommended");
    setPage(1);
  };

  const summaryCards = [
    {
      label: "Results",
      value: totalResults || displayedProviders.length,
      helper: "providers matching your filters",
    },
    {
      label: "Available Today",
      value: availableCount,
      helper: "ready for new bookings",
    },
    {
      label: "Average Starting Price",
      value: `INR ${averageRate.toLocaleString("en-IN")}`,
      helper: "service pricing on this page",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 5, md: 7 },
        background:
          "radial-gradient(circle at top left, rgba(96,165,250,0.16), transparent 36%), linear-gradient(180deg, #eff6ff 0%, #f8fafc 42%, #ffffff 100%)",
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            mb: 4,
            p: { xs: 3, md: 5 },
            borderRadius: 6,
            color: "white",
            background:
              "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #38bdf8 100%)",
            boxShadow: "0 32px 90px -48px rgba(30,64,175,0.9)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: "auto -8% -28% auto",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              filter: "blur(8px)",
            }}
          />

          <Chip
            icon={
              <AutoAwesomeRoundedIcon sx={{ color: "inherit !important" }} />
            }
            label="Trusted local marketplace"
            sx={{
              mb: 2.5,
              bgcolor: alpha("#ffffff", 0.14),
              color: "white",
              fontWeight: 700,
            }}
          />

          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: "-0.04em" }}
          >
            Find Service Providers
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              maxWidth: 780,
              fontSize: { xs: "1rem", md: "1.08rem" },
              color: alpha("#ffffff", 0.88),
            }}
          >
            Explore real providers, compare ratings and pricing, and jump
            straight into booking with a more responsive search experience.
          </Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mt: 4 }}
          >
            {summaryCards.map((card) => (
              <Box
                key={card.label}
                sx={{
                  minWidth: { xs: "100%", md: 190 },
                  px: 2.25,
                  py: 2,
                  borderRadius: 4,
                  bgcolor: alpha("#ffffff", 0.12),
                  backdropFilter: "blur(10px)",
                  border: "1px solid",
                  borderColor: alpha("#ffffff", 0.12),
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    color: alpha("#ffffff", 0.74),
                    letterSpacing: "0.12em",
                  }}
                >
                  {card.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {card.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: alpha("#ffffff", 0.76), mt: 0.5 }}
                >
                  {card.helper}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: { xs: 2.2, md: 3 },
            borderRadius: 5,
            border: "1px solid",
            borderColor: alpha("#0f172a", 0.08),
            boxShadow: "0 24px 60px -48px rgba(15,23,42,0.35)",
            bgcolor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search providers"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  if (page !== 1) {
                    setPage(1);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleManualSearch();
                  }
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
                  onChange={(event) => {
                    setServiceType(event.target.value);
                    if (page !== 1) {
                      setPage(1);
                    }
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
                onChange={(event) => {
                  setLocation(event.target.value);
                  if (page !== 1) {
                    setPage(1);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleManualSearch();
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceOutlinedIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ height: 56, borderRadius: 3, fontWeight: 700 }}
                onClick={handleManualSearch}
              >
                Search
              </Button>
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            sx={{
              mt: 2.25,
              alignItems: { xs: "stretch", lg: "center" },
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {serviceTypes.slice(1, 8).map((type) => {
                const selected = serviceType === type;

                return (
                  <Chip
                    key={type}
                    label={type}
                    clickable
                    color={selected ? "primary" : "default"}
                    onClick={() => {
                      setServiceType(selected ? "All" : type);
                      setPage(1);
                    }}
                    sx={{ borderRadius: 999, fontWeight: 600 }}
                  />
                );
              })}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel id="provider-sort-label">Sort by</InputLabel>
                <Select
                  labelId="provider-sort-label"
                  value={sortBy}
                  label="Sort by"
                  onChange={(event) => setSortBy(event.target.value)}
                  startAdornment={
                    <SortRoundedIcon sx={{ mr: 1, color: "text.secondary" }} />
                  }
                >
                  <MenuItem value="recommended">Recommended</MenuItem>
                  <MenuItem value="rating">Top rated</MenuItem>
                  <MenuItem value="experience">Most experienced</MenuItem>
                  <MenuItem value="price-low">Lowest price</MenuItem>
                  <MenuItem value="price-high">Highest price</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<RestartAltRoundedIcon />}
                sx={{ borderRadius: 999, fontWeight: 700 }}
                onClick={handleResetFilters}
              >
                Clear Filters
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Grid container spacing={3}>
            {Array.from(new Array(6)).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, xl: 4 }}>
                <Skeleton
                  variant="rectangular"
                  height={380}
                  sx={{ borderRadius: 5 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : displayedProviders.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 5 },
              textAlign: "center",
              borderRadius: 5,
              border: "1px dashed",
              borderColor: alpha("#2563eb", 0.24),
              bgcolor: alpha("#ffffff", 0.82),
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
              No providers found
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Try another service type, broaden the location, or clear your
              current filters.
            </Typography>
            <Button
              variant="contained"
              onClick={handleResetFilters}
              sx={{ borderRadius: 999, fontWeight: 700 }}
            >
              Reset Search
            </Button>
          </Paper>
        ) : (
          <>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{
                mb: 2.5,
                alignItems: { xs: "flex-start", md: "center" },
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, color: "#0f172a" }}
                >
                  {totalResults || displayedProviders.length} provider
                  {(totalResults || displayedProviders.length) === 1 ? "" : "s"}{" "}
                  found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeFiltersCount
                    ? `${activeFiltersCount} active filter${activeFiltersCount === 1 ? "" : "s"} applied`
                    : "Showing all currently matched providers"}
                </Typography>
              </Box>
              <Chip
                label={`${availableCount} available for booking`}
                color="success"
                sx={{ borderRadius: 999, fontWeight: 700 }}
              />
            </Stack>

            <Grid container spacing={3}>
              {displayedProviders.map((provider) => (
                <Grid key={provider.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                  <ProviderCard provider={provider} />
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            ) : null}
          </>
        )}
      </Container>
    </Box>
  );
};

export default ProvidersList;
