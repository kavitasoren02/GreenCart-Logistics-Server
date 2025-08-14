const mongoose = require("mongoose")

const simulationSchema = new mongoose.Schema(
  {
    simulation_id: {
      type: String,
      required: true,
      unique: true,
    },
    inputs: {
      available_drivers: {
        type: Number,
        required: true,
      },
      start_time: {
        type: String,
        required: true,
      },
      max_hours_per_day: {
        type: Number,
        required: true,
      },
    },
    results: {
      total_profit: {
        type: Number,
        required: true,
      },
      efficiency_score: {
        type: Number,
        required: true,
      },
      on_time_deliveries: {
        type: Number,
        required: true,
      },
      late_deliveries: {
        type: Number,
        required: true,
      },
      total_fuel_cost: {
        type: Number,
        required: true,
      },
      total_penalties: {
        type: Number,
        required: true,
      },
      total_bonuses: {
        type: Number,
        required: true,
      },
    },
    orders_processed: [
      {
        order_id: String,
        driver_assigned: String,
        delivery_status: String,
        profit_contribution: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Simulation", simulationSchema)
