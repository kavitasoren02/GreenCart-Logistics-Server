const express = require("express")
const { body, validationResult } = require("express-validator")
const Driver = require("../models/Driver")
const auth = require("../middleware/auth")

const router = express.Router()

// Validation middleware
const validateDriver = [
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
  body("shift_hours").isInt({ min: 1, max: 24 }).withMessage("Shift hours must be between 1 and 24"),
  body("past_week_hours")
    .matches(/^\d+(\|\d+){6}$/)
    .withMessage("Past week hours must be in format: 'h|h|h|h|h|h|h'"),
]

// GET /api/drivers - Get all drivers
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const query = search ? { name: { $regex: search, $options: "i" } } : {}

    const drivers = await Driver.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })

    const total = await Driver.countDocuments(query)

    res.json({
      drivers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Error fetching drivers:", error)
    res.status(500).json({
      error: "Failed to fetch drivers",
      message: error.message,
    })
  }
})

// GET /api/drivers/:id - Get single driver
router.get("/:id", auth, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({
        error: "Driver not found",
        message: "No driver found with the provided ID",
      })
    }
    res.json(driver)
  } catch (error) {
    console.error("Error fetching driver:", error)
    res.status(500).json({
      error: "Failed to fetch driver",
      message: error.message,
    })
  }
})

// POST /api/drivers - Create new driver
router.post("/", auth, validateDriver, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const driver = new Driver(req.body)
    await driver.save()

    res.status(201).json({
      message: "Driver created successfully",
      driver,
    })
  } catch (error) {
    console.error("Error creating driver:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Driver already exists",
        message: "A driver with this information already exists",
      })
    }
    res.status(500).json({
      error: "Failed to create driver",
      message: error.message,
    })
  }
})

// PUT /api/drivers/:id - Update driver
router.put("/:id", auth, validateDriver, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!driver) {
      return res.status(404).json({
        error: "Driver not found",
        message: "No driver found with the provided ID",
      })
    }

    res.json({
      message: "Driver updated successfully",
      driver,
    })
  } catch (error) {
    console.error("Error updating driver:", error)
    res.status(500).json({
      error: "Failed to update driver",
      message: error.message,
    })
  }
})

// DELETE /api/drivers/:id - Delete driver
router.delete("/:id", auth, async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id)
    if (!driver) {
      return res.status(404).json({
        error: "Driver not found",
        message: "No driver found with the provided ID",
      })
    }

    res.json({
      message: "Driver deleted successfully",
      driver,
    })
  } catch (error) {
    console.error("Error deleting driver:", error)
    res.status(500).json({
      error: "Failed to delete driver",
      message: error.message,
    })
  }
})

module.exports = router
