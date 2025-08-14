const Driver = require("../models/Driver")
const Route = require("../models/Route")
const Order = require("../models/Order")
const Simulation = require("../models/Simulation")

class SimulationEngine {
  constructor() {
    this.currentSimulation = null
  }

  // Convert time string (HH:MM) to minutes
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours * 60 + minutes
  }

  // Convert minutes to time string (HH:MM)
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  // Calculate actual delivery time considering driver fatigue
  calculateActualDeliveryTime(baseTimeMin, driverFatigued) {
    if (driverFatigued) {
      // 30% speed decrease means 30% more time needed
      return Math.ceil(baseTimeMin * 1.3)
    }
    return baseTimeMin
  }

  // Check if delivery is on time (within base time + 10 minutes)
  isDeliveryOnTime(actualTimeMin, baseTimeMin) {
    return actualTimeMin <= baseTimeMin + 10
  }

  // Calculate fuel cost for a route
  calculateFuelCost(route) {
    const baseCost = route.distance_km * 5 // ₹5/km base cost
    const surcharge = route.traffic_level === "High" ? route.distance_km * 2 : 0 // +₹2/km for high traffic
    return baseCost + surcharge
  }

  // Calculate penalties and bonuses for an order
  calculateOrderProfitComponents(order, route, isOnTime, actualDeliveryTime) {
    let penalty = 0
    let bonus = 0

    // Late delivery penalty: ₹50 if late
    if (!isOnTime) {
      penalty = 50
    }

    // High-value bonus: 10% bonus if order > ₹1000 AND delivered on time
    if (order.value_rs > 1000 && isOnTime) {
      bonus = order.value_rs * 0.1
    }

    const fuelCost = this.calculateFuelCost(route)
    const netProfit = order.value_rs + bonus - penalty - fuelCost

    return {
      penalty,
      bonus,
      fuelCost,
      netProfit,
      isOnTime,
      actualDeliveryTime,
    }
  }

  // Assign orders to drivers based on availability and constraints
  async assignOrdersToDrivers(availableDrivers, maxHoursPerDay, startTimeMin) {
    const drivers = await Driver.find().limit(availableDrivers)
    console.log(`Found ${drivers.length} drivers for simulation`)

    const orders = await Order.find()
    console.log(`Found ${orders.length} orders for simulation`)

    const routes = await Route.find()
    console.log(`Found ${routes.length} routes for simulation`)

    const routeMap = new Map()
    routes.forEach((route) => {
      routeMap.set(route.route_id, route)
      routeMap.set(route.route_id.toString(), route)
      routeMap.set(Number.parseInt(route.route_id), route)
    })

    const assignments = []
    const driverWorkHours = new Map()

    // Initialize driver work hours
    for (const driver of drivers) {
      driverWorkHours.set(driver._id.toString(), 0)
    }

    // Sort orders by delivery time to prioritize earlier deliveries
    const sortedOrders = orders.sort((a, b) => {
      const timeA = this.timeToMinutes(a.delivery_time)
      const timeB = this.timeToMinutes(b.delivery_time)
      return timeA - timeB
    })

    for (const order of sortedOrders) {
      let route = routeMap.get(order.route_id)
      if (!route) {
        route = routeMap.get(order.route_id.toString())
      }
      if (!route) {
        route = routeMap.get(Number.parseInt(order.route_id))
      }

      if (!route) {
        console.log(`Route not found for order ${order.order_id}, route_id: ${order.route_id}`)
        continue
      }

      // Find available driver
      let assignedDriver = null
      for (const driver of drivers) {
        const driverId = driver._id.toString()
        const currentHours = driverWorkHours.get(driverId)
        const routeTimeHours = route.base_time_min / 60

        // Check if driver can take this order without exceeding max hours
        if (currentHours + routeTimeHours <= maxHoursPerDay) {
          assignedDriver = driver
          driverWorkHours.set(driverId, currentHours + routeTimeHours)
          break
        }
      }

      if (assignedDriver) {
        const pastWeekHours = assignedDriver.past_week_hours
          ? assignedDriver.past_week_hours.split("|").map((h) => Number.parseInt(h))
          : [8, 8, 8, 8, 8, 8, 8]
        const avgDailyHours = pastWeekHours.reduce((sum, h) => sum + h, 0) / 7
        const isFatigued = avgDailyHours > 8

        const actualDeliveryTime = this.calculateActualDeliveryTime(route.base_time_min, isFatigued)
        const isOnTime = this.isDeliveryOnTime(actualDeliveryTime, route.base_time_min)

        const profitComponents = this.calculateOrderProfitComponents(order, route, isOnTime, actualDeliveryTime)

        assignments.push({
          order,
          driver: assignedDriver,
          route,
          ...profitComponents,
        })

        try {
          await Order.findByIdAndUpdate(order._id, {
            assigned_driver: assignedDriver._id,
            is_delivered: true,
            is_on_time: isOnTime,
            penalty_applied: profitComponents.penalty,
            bonus_applied: profitComponents.bonus,
          })
        } catch (updateError) {
          console.log("Order update failed, continuing simulation:", updateError.message)
        }
      }
    }

    console.log(`Created ${assignments.length} assignments`)
    return assignments
  }

  // Calculate overall KPIs from assignments
  calculateKPIs(assignments) {
    const totalOrders = assignments.length
    const onTimeDeliveries = assignments.filter((a) => a.isOnTime).length
    const lateDeliveries = totalOrders - onTimeDeliveries

    const totalProfit = assignments.reduce((sum, a) => sum + a.netProfit, 0)
    const totalFuelCost = assignments.reduce((sum, a) => sum + a.fuelCost, 0)
    const totalPenalties = assignments.reduce((sum, a) => sum + a.penalty, 0)
    const totalBonuses = assignments.reduce((sum, a) => sum + a.bonus, 0)

    const efficiencyScore = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0

    return {
      total_profit: Math.round(totalProfit * 100) / 100,
      efficiency_score: Math.round(efficiencyScore * 100) / 100,
      on_time_deliveries: onTimeDeliveries,
      late_deliveries: lateDeliveries,
      total_fuel_cost: Math.round(totalFuelCost * 100) / 100,
      total_penalties: totalPenalties,
      total_bonuses: Math.round(totalBonuses * 100) / 100,
      total_orders: totalOrders,
    }
  }

  // Main simulation function
  async runSimulation(inputs) {
    try {
      const { available_drivers, start_time, max_hours_per_day } = inputs

      // Validation
      if (!available_drivers || available_drivers < 1) {
        throw new Error("Number of available drivers must be at least 1")
      }

      if (!start_time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(start_time)) {
        throw new Error("Start time must be in HH:MM format")
      }

      if (!max_hours_per_day || max_hours_per_day < 1 || max_hours_per_day > 24) {
        throw new Error("Max hours per day must be between 1 and 24")
      }

      const startTimeMin = this.timeToMinutes(start_time)

      // await Order.updateMany(
      //   {},
      //   {
      //     assigned_driver: null,
      //     is_delivered: false,
      //     is_on_time: null,
      //     penalty_applied: 0,
      //     bonus_applied: 0,
      //   },
      // )

      // Assign orders to drivers
      const assignments = await this.assignOrdersToDrivers(available_drivers, max_hours_per_day, startTimeMin)

      // Calculate KPIs
      const kpis = this.calculateKPIs(assignments)

      // Create simulation record
      const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const simulation = new Simulation({
        simulation_id: simulationId,
        inputs: {
          available_drivers,
          start_time,
          max_hours_per_day,
        },
        results: kpis,
        orders_processed: assignments.map((a) => ({
          order_id: a.order.order_id,
          driver_assigned: a.driver.name,
          delivery_status: a.isOnTime ? "On Time" : "Late",
          profit_contribution: a.netProfit,
        })),
      })

      await simulation.save()

      return {
        simulation_id: simulationId,
        inputs,
        results: kpis,
        assignments: assignments.map((a) => ({
          order_id: a.order.order_id,
          driver_name: a.driver.name,
          route_id: a.route.route_id,
          is_on_time: a.isOnTime,
          profit_contribution: a.netProfit,
          fuel_cost: a.fuelCost,
          penalty: a.penalty,
          bonus: a.bonus,
        })),
      }
    } catch (error) {
      console.error("Simulation error:", error)
      throw error
    }
  }

  // Get simulation history
  async getSimulationHistory(page = 1, limit = 10) {
    try {
      const simulations = await Simulation.find()
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Simulation.countDocuments()

      return {
        simulations,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      }
    } catch (error) {
      console.error("Error fetching simulation history:", error)
      throw error
    }
  }

  // Get specific simulation by ID
  async getSimulation(simulationId) {
    try {
      const simulation = await Simulation.findOne({ simulation_id: simulationId })
      if (!simulation) {
        throw new Error("Simulation not found")
      }
      return simulation
    } catch (error) {
      console.error("Error fetching simulation:", error)
      throw error
    }
  }
}

module.exports = new SimulationEngine()
