const axios = require("axios")
const csv = require("csv-parser")
const { Readable } = require("stream")
const Driver = require("../models/Driver")
const Route = require("../models/Route")
const Order = require("../models/Order")
const fs = require("fs").promises
const path = require("path")

class DataLoader {
  constructor() {
    this.csvPaths = {
      drivers: path.join(__dirname, "../sample-data/drivers.csv"),
      orders: path.join(__dirname, "../sample-data/orders.csv"),
      routes: path.join(__dirname, "../sample-data/routes.csv"),
    }
  }

  async fetchCsvData(filePath) {
    try {
      console.log(`Reading CSV data from: ${filePath}`)
      const csvData = await fs.readFile(filePath, "utf8")
      return csvData
    } catch (error) {
      console.error(`Error reading CSV from ${filePath}:`, error.message)
      throw new Error(`Failed to read CSV data: ${error.message}`)
    }
  }

  async parseCsvData(csvData) {
    return new Promise((resolve, reject) => {
      const results = []
      const stream = Readable.from([csvData])

      stream
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error))
    })
  }

  async loadDrivers() {
    try {
      console.log("Loading drivers data...")
      const csvData = await this.fetchCsvData(this.csvPaths.drivers)
      const driversData = await this.parseCsvData(csvData)

      await Driver.deleteMany({})

      const drivers = driversData.map((row) => ({
        name: row.name?.trim(),
        shift_hours: Number.parseInt(row.shift_hours) || 8,
        past_week_hours: row.past_week_hours?.trim() || "8|8|8|8|8|8|8",
      }))

      const savedDrivers = await Driver.insertMany(drivers)
      console.log(`Successfully loaded ${savedDrivers.length} drivers`)
      return savedDrivers
    } catch (error) {
      console.error("Error loading drivers:", error)
      throw error
    }
  }

  async loadRoutes() {
    try {
      console.log("Loading routes data...")
      const csvData = await this.fetchCsvData(this.csvPaths.routes)
      const routesData = await this.parseCsvData(csvData)

      await Route.deleteMany({})

      const routes = routesData.map((row) => ({
        route_id: Number.parseInt(row.route_id),
        distance_km: Number.parseFloat(row.distance_km),
        traffic_level: row.traffic_level?.trim() || "Medium",
        base_time_min: Number.parseInt(row.base_time_min),
      }))

      const savedRoutes = await Route.insertMany(routes)
      console.log(`Successfully loaded ${savedRoutes.length} routes`)
      return savedRoutes
    } catch (error) {
      console.error("Error loading routes:", error)
      throw error
    }
  }

  async loadOrders() {
    try {
      console.log("Loading orders data...")
      const csvData = await this.fetchCsvData(this.csvPaths.orders)
      const ordersData = await this.parseCsvData(csvData)

      await Order.deleteMany({})

      const orders = ordersData.map((row) => ({
        order_id: row.order_id?.trim(),
        value_rs: Number.parseFloat(row.value_rs),
        route_id: Number.parseInt(row.route_id),
        delivery_time: row.delivery_time?.trim(),
      }))

      const savedOrders = await Order.insertMany(orders)
      console.log(`Successfully loaded ${savedOrders.length} orders`)
      return savedOrders
    } catch (error) {
      console.error("Error loading orders:", error)
      throw error
    }
  }

  async loadAllData() {
    try {
      console.log("Starting data loading process...")
      const results = await Promise.allSettled([this.loadDrivers(), this.loadRoutes(), this.loadOrders()])

      const summary = {
        drivers: results[0].status === "fulfilled" ? results[0].value.length : 0,
        routes: results[1].status === "fulfilled" ? results[1].value.length : 0,
        orders: results[2].status === "fulfilled" ? results[2].value.length : 0,
        errors: results.filter((r) => r.status === "rejected").map((r) => r.reason.message),
      }

      console.log("Data loading completed:", summary)
      return summary
    } catch (error) {
      console.error("Error in loadAllData:", error)
      throw error
    }
  }
}

module.exports = new DataLoader()
