const express = require("express")
const dataLoader = require("../services/dataLoader")
const auth = require("../middleware/auth")

const router = express.Router()

// POST /api/data/load - Load all CSV data
router.post("/load", auth, async (req, res) => {
  try {
    console.log("Data loading requested by user:", req.user.username)
    const result = await dataLoader.loadAllData()

    res.json({
      message: "Data loading completed",
      summary: result,
    })
  } catch (error) {
    console.error("Error loading data:", error)
    res.status(500).json({
      error: "Failed to load data",
      message: error.message,
    })
  }
})

// POST /api/data/load/drivers - Load only drivers data
router.post("/load/drivers", auth, async (req, res) => {
  try {
    const drivers = await dataLoader.loadDrivers()
    res.json({
      message: "Drivers data loaded successfully",
      count: drivers.length,
      drivers,
    })
  } catch (error) {
    console.error("Error loading drivers:", error)
    res.status(500).json({
      error: "Failed to load drivers data",
      message: error.message,
    })
  }
})

// POST /api/data/load/routes - Load only routes data
router.post("/load/routes", auth, async (req, res) => {
  try {
    const routes = await dataLoader.loadRoutes()
    res.json({
      message: "Routes data loaded successfully",
      count: routes.length,
      routes,
    })
  } catch (error) {
    console.error("Error loading routes:", error)
    res.status(500).json({
      error: "Failed to load routes data",
      message: error.message,
    })
  }
})

// POST /api/data/load/orders - Load only orders data
router.post("/load/orders", auth, async (req, res) => {
  try {
    const orders = await dataLoader.loadOrders()
    res.json({
      message: "Orders data loaded successfully",
      count: orders.length,
      orders,
    })
  } catch (error) {
    console.error("Error loading orders:", error)
    res.status(500).json({
      error: "Failed to load orders data",
      message: error.message,
    })
  }
})

module.exports = router
