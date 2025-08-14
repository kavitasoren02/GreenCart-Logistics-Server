const express = require("express")
const { body, validationResult } = require("express-validator")
const simulationEngine = require("../services/simulationEngine")
const auth = require("../middleware/auth")

const router = express.Router()

// Validation middleware for simulation inputs
const validateSimulationInputs = [
  body("available_drivers").isInt({ min: 1, max: 100 }).withMessage("Available drivers must be between 1 and 100"),
  body("start_time")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),
  body("max_hours_per_day").isInt({ min: 1, max: 24 }).withMessage("Max hours per day must be between 1 and 24"),
]

// POST /api/simulation/run - Run a new simulation
router.post("/run", auth, validateSimulationInputs, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    console.log(`Simulation requested by user: ${req.user.username}`)
    console.log("Simulation inputs:", req.body)

    const result = await simulationEngine.runSimulation(req.body)

    res.json({
      message: "Simulation completed successfully",
      ...result,
    })
  } catch (error) {
    console.error("Simulation error:", error)
    res.status(500).json({
      error: "Simulation failed",
      message: error.message,
    })
  }
})

// GET /api/simulation/history - Get simulation history
router.get("/history", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const result = await simulationEngine.getSimulationHistory(page, limit)

    res.json(result)
  } catch (error) {
    console.error("Error fetching simulation history:", error)
    res.status(500).json({
      error: "Failed to fetch simulation history",
      message: error.message,
    })
  }
})

// GET /api/simulation/:id - Get specific simulation
router.get("/:id", auth, async (req, res) => {
  try {
    const simulation = await simulationEngine.getSimulation(req.params.id)
    res.json(simulation)
  } catch (error) {
    console.error("Error fetching simulation:", error)
    if (error.message === "Simulation not found") {
      return res.status(404).json({
        error: "Simulation not found",
        message: "No simulation found with the provided ID",
      })
    }
    res.status(500).json({
      error: "Failed to fetch simulation",
      message: error.message,
    })
  }
})

// GET /api/simulation/stats/summary - Get overall simulation statistics
router.get("/stats/summary", auth, async (req, res) => {
  try {
    const { simulations } = await simulationEngine.getSimulationHistory(1, 1000) // Get all simulations

    if (simulations.length === 0) {
      return res.json({
        total_simulations: 0,
        average_profit: 0,
        average_efficiency: 0,
        best_efficiency: 0,
        worst_efficiency: 0,
      })
    }

    const totalSimulations = simulations.length
    const avgProfit = simulations.reduce((sum, s) => sum + s.results.total_profit, 0) / totalSimulations
    const avgEfficiency = simulations.reduce((sum, s) => sum + s.results.efficiency_score, 0) / totalSimulations
    const bestEfficiency = Math.max(...simulations.map((s) => s.results.efficiency_score))
    const worstEfficiency = Math.min(...simulations.map((s) => s.results.efficiency_score))

    res.json({
      total_simulations: totalSimulations,
      average_profit: Math.round(avgProfit * 100) / 100,
      average_efficiency: Math.round(avgEfficiency * 100) / 100,
      best_efficiency: bestEfficiency,
      worst_efficiency: worstEfficiency,
    })
  } catch (error) {
    console.error("Error fetching simulation stats:", error)
    res.status(500).json({
      error: "Failed to fetch simulation statistics",
      message: error.message,
    })
  }
})

module.exports = router
