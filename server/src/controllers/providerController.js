const Provider = require("../models/Provider");

// Create provider profile
const createProvider = async (req, res) => {
  try {
    const { serviceType, bio, hourlyRate, yearsExperience, location } = req.body;

    const provider = await Provider.create({
      user: req.user._id,
      serviceType,
      bio,
      hourlyRate,
      yearsExperience,
      location
    });

    res.status(201).json({
      success: true,
      data: provider
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProviders = async (req, res) => {
  try {
    const providers = await Provider.find()
      .populate("user", "firstName lastName email");

    res.json({
      success: true,
      data: providers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate("user", "firstName lastName email");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    res.json({
      success: true,
      data: provider
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    // Only owner can update
    if (provider.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedProvider
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    if (provider.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await provider.deleteOne();

    res.json({
      success: true,
      message: "Provider deleted"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider
};
