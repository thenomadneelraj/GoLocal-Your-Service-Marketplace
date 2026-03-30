// server/src/controllers/adminStatsController.js
// Mocked stats data for MVP Admin Dashboard to feed Recharts

const getUsersGrowth = async (req, res) => {
  try {
    const data = [
      { month: "Jan", users: 120 },
      { month: "Feb", users: 154 },
      { month: "Mar", users: 189 },
      { month: "Apr", users: 245 },
      { month: "May", users: 310 },
      { month: "Jun", users: 405 },
    ];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRevenue = async (req, res) => {
  try {
    const data = [
      { month: "Jan", revenue: 4000 },
      { month: "Feb", revenue: 5500 },
      { month: "Mar", revenue: 6200 },
      { month: "Apr", revenue: 7800 },
      { month: "May", revenue: 9500 },
      { month: "Jun", revenue: 12000 },
    ];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookings = async (req, res) => {
  try {
    const data = [
      { name: "Completed", value: 340 },
      { name: "Pending", value: 85 },
      { name: "Cancelled", value: 32 },
    ];
    // Return colors for pie chart mapping in frontend
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getServicesDist = async (req, res) => {
  try {
    const data = [
      { name: "Plumbing", value: 120 },
      { name: "Electrical", value: 95 },
      { name: "Cleaning", value: 150 },
      { name: "Carpentry", value: 65 },
      { name: "HVAC", value: 80 },
    ];
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsersGrowth,
  getRevenue,
  getBookings,
  getServicesDist,
};
