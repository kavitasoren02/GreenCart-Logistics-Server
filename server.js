const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET environment variable is required")
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/greencart", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async() => {
    console.log("Loading sample data...")
    const loadResult = await dataLoader.loadAllData()
    console.log("Sample data loaded successfully:", loadResult)
  })
  .catch((err) => console.error("MongoDB connection error:", err))

// Import routes
const authRoutes = require("./routes/auth")
const driversRoutes = require("./routes/drivers")
const routesRoutes = require("./routes/routes")
const ordersRoutes = require("./routes/orders")
const dataRoutes = require("./routes/data")
const simulationRoutes = require("./routes/simulation")
const dataLoader = require("./services/dataLoader")

// Basic health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "GreenCart Logistics API is running",
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/drivers", driversRoutes)
app.use("/api/routes", routesRoutes)
app.use("/api/orders", ordersRoutes)
app.use("/api/data", dataRoutes)
app.use("/api/simulation", simulationRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
