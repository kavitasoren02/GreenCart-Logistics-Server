const express = require("express")
const { body, validationResult } = require("express-validator")
const Route = require("../models/Route")
const auth = require("../middleware/auth")

const router = express.Router()

// Validation middleware
const validateRoute = [
  body("route_id").isInt({ min: 1 }).withMessage("Route ID must be a positive integer"),
  body("distance_km").isFloat({ min: 0.1 }).withMessage("Distance must be greater than 0"),
  body("traffic_level").isIn(["Low", "Medium", "High"]).withMessage("Traffic level must be Low, Medium, or High"),
  body("base_time_min").isInt({ min: 1 }).withMessage("Base time must be at least 1 minute"),
]

// GET /api/routes - Get all routes
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, traffic_level } = req.query
    const query = traffic_level ? { traffic_level } : {}

    const routes = await Route.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ route_id: 1 })

    const total = await Route.countDocuments(query)

    res.json({
      routes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Error fetching routes:", error)
    res.status(500).json({
      error: "Failed to fetch routes",
      message: error.message,
    })
  }
})

// GET /api/routes/:id - Get single route
router.get("/:id", auth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
    if (!route) {
      return res.status(404).json({
        error: "Route not found",
        message: "No route found with the provided ID",
      })
    }
    res.json(route)
  } catch (error) {
    console.error("Error fetching route:", error)
    res.status(500).json({
      error: "Failed to fetch route",
      message: error.message,
    })
  }
})

// POST /api/routes - Create new route
router.post("/", auth, validateRoute, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const route = new Route(req.body)
    await route.save()

    res.status(201).json({
      message: "Route created successfully",
      route,
    })
  } catch (error) {
    console.error("Error creating route:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Route already exists",
        message: "A route with this ID already exists",
      })
    }
    res.status(500).json({
      error: "Failed to create route",
      message: error.message,
    })
  }
})

// PUT /api/routes/:id - Update route
router.put("/:id", auth, validateRoute, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!route) {
      return res.status(404).json({
        error: "Route not found",
        message: "No route found with the provided ID",
      })
    }

    res.json({
      message: "Route updated successfully",
      route,
    })
  } catch (error) {
    console.error("Error updating route:", error)
    res.status(500).json({
      error: "Failed to update route",
      message: error.message,
    })
  }
})

// DELETE /api/routes/:id - Delete route
router.delete("/:id", auth, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id)
    if (!route) {
      return res.status(404).json({
        error: "Route not found",
        message: "No route found with the provided ID",
      })
    }

    res.json({
      message: "Route deleted successfully",
      route,
    })
  } catch (error) {
    console.error("Error deleting route:", error)
    res.status(500).json({
      error: "Failed to delete route",
      message: error.message,
    })
  }
})

module.exports = router
