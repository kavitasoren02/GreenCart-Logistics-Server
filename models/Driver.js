const mongoose = require("mongoose")

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shift_hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    past_week_hours: {
      type: String,
      required: true,
      // Format: "7|10|7|7|9|9|8" (7 days separated by |)
    },
    current_day_hours: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_fatigued: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Method to get past week hours as array
driverSchema.methods.getPastWeekHoursArray = function () {
  return this.past_week_hours.split("|").map((hours) => Number.parseInt(hours))
}

// Method to check if driver is fatigued (worked >8 hours yesterday)
driverSchema.methods.checkFatigue = function () {
  const hoursArray = this.getPastWeekHoursArray()
  const yesterdayHours = hoursArray[hoursArray.length - 1] // Last day
  this.is_fatigued = yesterdayHours > 8
  return this.is_fatigued
}

module.exports = mongoose.model("Driver", driverSchema)
