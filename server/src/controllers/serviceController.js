const Service = require("../models/Service");
const User = require("../models/User");

const serializeService = (service) => ({
  id: service._id,
  _id: service._id,
  title: service.title,
  name: service.title,
  description: service.description,
  category: service.category,
  status: service.status || "active",
  price: Number(service.price || 0),
  duration: service.duration || "1 hour",
  locationType: service.locationType || "offline",
  images: Array.isArray(service.images) ? service.images : [],
  rating: Number(service.rating || 0),
  totalBookings: Number(service.totalBookings || 0),
  availability: service.status === "active",
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});

const syncProviderServices = async (providerId) => {
  const services = await Service.find({ providerId }).sort({ createdAt: -1 });
  const activeServices = services.filter((service) => service.status === "active");
  const categories = [
    ...new Set(
      activeServices
        .map((service) => String(service.category || "").trim())
        .filter(Boolean),
    ),
  ];
  const works = activeServices.map((service) => ({
    title: service.title,
    price: Number(service.price || 0),
  }));
  const prices = activeServices
    .map((service) => Number(service.price || 0))
    .filter((price) => price > 0);
  const visibleCategories = categories.filter(
    (category) => category.toLowerCase() !== "other",
  );
  const primaryCategory =
    visibleCategories[0] || categories[0] || activeServices[0]?.title || "Other";

  await User.findOneAndUpdate(
    { _id: providerId, role: "provider" },
    {
      services: services.map((service) => service._id),
      works,
      workCategories: visibleCategories.length ? visibleCategories : [],
      serviceType: primaryCategory,
      hourlyRate: prices.length ? Math.min(...prices) : 0,
    },
    { new: true }
  );
};

const listMyServices = async (req, res) => {
  try {
    const items = await Service.find({ providerId: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: {
        items: items.map(serializeService),
        total: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createService = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const category = String(req.body?.category || "").trim();
    const status =
      String(req.body?.status || "").trim().toLowerCase() === "inactive"
        ? "inactive"
        : "active";
    const duration = String(req.body?.duration || "1 hour").trim();
    const locationType =
      String(req.body?.locationType || "offline").trim().toLowerCase() ===
      "online"
        ? "online"
        : "offline";
    const price = Number(req.body?.price || 0);

    if (!title || !category || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "title, category, and a valid price are required.",
      });
    }

    const existingService = await Service.findOne({
      providerId: req.user._id,
      category: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: `${category} already exists. Edit its rate instead of adding it again.`,
      });
    }

    const service = await Service.create({
      providerId: req.user._id,
      title,
      description: description || `${category} service offered by this provider.`,
      category,
      status,
      duration,
      locationType,
      price,
      images: Array.isArray(req.body?.images)
        ? req.body.images.filter(Boolean)
        : [],
    });

    await syncProviderServices(req.user._id);

    res.status(201).json({
      success: true,
      data: serializeService(service),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      providerId: req.user._id,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    const requestedCategory =
      req.body?.category !== undefined
        ? String(req.body.category || "").trim()
        : service.category;

    const conflictingService = await Service.findOne({
      _id: { $ne: service._id },
      providerId: req.user._id,
      category: new RegExp(
        `^${String(requestedCategory || "")
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
    });

    if (requestedCategory && conflictingService) {
      return res.status(409).json({
        success: false,
        message: `${requestedCategory} already exists. Update the existing service instead.`,
      });
    }

    const fields = ["title", "description", "category", "duration", "status", "locationType"];

    fields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        service[field] = String(req.body[field] || "").trim() || service[field];
      }
    });

    if (req.body?.price !== undefined) {
      const price = Number(req.body.price || 0);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be greater than zero.",
        });
      }
      service.price = price;
    }

    if (req.body?.status !== undefined) {
      service.status =
        String(req.body.status || "").trim().toLowerCase() === "inactive"
          ? "inactive"
          : "active";
    }

    if (req.body?.locationType !== undefined) {
      service.locationType =
        String(req.body.locationType || "").trim().toLowerCase() === "online"
          ? "online"
          : "offline";
    }

    if (req.body?.images !== undefined) {
      service.images = Array.isArray(req.body.images)
        ? req.body.images.filter(Boolean)
        : [];
    }

    await service.save();
    await syncProviderServices(req.user._id);

    res.json({
      success: true,
      data: serializeService(service),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findOneAndDelete({
      _id: req.params.id,
      providerId: req.user._id,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    await syncProviderServices(req.user._id);

    res.json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  listMyServices,
  createService,
  updateService,
  deleteService,
};
