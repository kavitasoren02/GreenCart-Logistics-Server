const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
    },
    value_rs: {
      type: Number,
      required: true,
      min: 0,
    },
    route_id: {
      type: Number,
      required: true,
      ref: "Route",
    },
    delivery_time: {
      type: String,
      required: true,
      // Format: "HH:MM"
    },
    assigned_driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    is_delivered: {
      type: Boolean,
      default: false,
    },
    is_on_time: {
      type: Boolean,
      default: null,
    },
    penalty_applied: {
      type: Number,
      default: 0,
    },
    bonus_applied: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Order", orderSchema)
