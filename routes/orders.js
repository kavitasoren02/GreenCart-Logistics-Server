const express = require("express")
const { body, validationResult } = require("express-validator")
const Order = require("../models/Order")
const Route = require("../models/Route")
const auth = require("../middleware/auth")

const router = express.Router()

// Validation middleware
const validateOrder = [
  body("order_id").trim().isLength({ min: 1 }).withMessage("Order ID is required"),
  body("value_rs").isFloat({ min: 0 }).withMessage("Order value must be non-negative"),
  body("route_id").isInt({ min: 1 }).withMessage("Route ID must be a positive integer"),
  body("delivery_time")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Delivery time must be in HH:MM format"),
]

// GET /api/orders - Get all orders
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, route_id, is_delivered } = req.query
    const query = {}

    if (route_id) query.route_id = route_id
    if (is_delivered !== undefined) query.is_delivered = is_delivered === "true"

    const orders = await Order.find(query)
      .populate("assigned_driver", "name")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })

    const total = await Order.countDocuments(query)

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message,
    })
  }
})

// GET /api/orders/:id - Get single order
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("assigned_driver", "name")
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "No order found with the provided ID",
      })
    }
    res.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    res.status(500).json({
      error: "Failed to fetch order",
      message: error.message,
    })
  }
})

// POST /api/orders - Create new order
router.post("/", auth, validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    // Verify route exists
    const routeExists = await Route.findOne({ route_id: req.body.route_id })
    if (!routeExists) {
      return res.status(400).json({
        error: "Invalid route",
        message: "The specified route does not exist",
      })
    }

    const order = new Order(req.body)
    await order.save()

    res.status(201).json({
      message: "Order created successfully",
      order,
    })
  } catch (error) {
    console.error("Error creating order:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Order already exists",
        message: "An order with this ID already exists",
      })
    }
    res.status(500).json({
      error: "Failed to create order",
      message: error.message,
    })
  }
})

// PUT /api/orders/:id - Update order
router.put("/:id", auth, validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    // Verify route exists if route_id is being updated
    if (req.body.route_id) {
      const routeExists = await Route.findOne({ route_id: req.body.route_id })
      if (!routeExists) {
        return res.status(400).json({
          error: "Invalid route",
          message: "The specified route does not exist",
        })
      }
    }

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("assigned_driver", "name")

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "No order found with the provided ID",
      })
    }

    res.json({
      message: "Order updated successfully",
      order,
    })
  } catch (error) {
    console.error("Error updating order:", error)
    res.status(500).json({
      error: "Failed to update order",
      message: error.message,
    })
  }
})

// DELETE /api/orders/:id - Delete order
router.delete("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "No order found with the provided ID",
      })
    }

    res.json({
      message: "Order deleted successfully",
      order,
    })
  } catch (error) {
    console.error("Error deleting order:", error)
    res.status(500).json({
      error: "Failed to delete order",
      message: error.message,
    })
  }
})

module.exports = router
