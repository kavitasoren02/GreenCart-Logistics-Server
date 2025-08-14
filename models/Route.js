const mongoose = require("mongoose")

const routeSchema = new mongoose.Schema(
  {
    route_id: {
      type: Number,
      required: true,
      unique: true,
    },
    distance_km: {
      type: Number,
      required: true,
      min: 0,
    },
    traffic_level: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High"],
    },
    base_time_min: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Method to calculate fuel cost
routeSchema.methods.calculateFuelCost = function () {
  const baseCost = this.distance_km * 5 // ₹5/km base cost
  const surcharge = this.traffic_level === "High" ? this.distance_km * 2 : 0 // +₹2/km for high traffic
  return baseCost + surcharge
}

module.exports = mongoose.model("Route", routeSchema)
