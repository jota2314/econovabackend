/**
 * Pricing constants and defaults for the CRM system
 */

export const DEFAULT_PRICING = {
  INSULATION: {
    closed_cell: {
      base_price_per_sqft: 2.50,
      r_value_per_inch: 6.5,
      max_thickness_inches: 6
    },
    open_cell: {
      base_price_per_sqft: 1.75,
      r_value_per_inch: 3.7,
      max_thickness_inches: 12
    },
    hybrid: {
      closed_cell_base: 2.50,
      open_cell_base: 1.75,
      complexity_multiplier: 1.15
    }
  },
  HVAC: {
    central_air: {
      base_price_per_ton: 3500,
      ductwork_price_per_linear_ft: 45,
      vent_price_each: 125
    },
    heat_pump: {
      base_price_per_ton: 4200,
      ductwork_price_per_linear_ft: 45,
      vent_price_each: 125
    },
    furnace: {
      base_price_per_ton: 2800,
      ductwork_price_per_linear_ft: 45,
      vent_price_each: 125
    }
  },
  PLASTER: {
    wall_repair: {
      good_condition: 8.50, // per sq ft
      fair_condition: 12.00,
      poor_condition: 18.50
    },
    ceiling_repair: {
      good_condition: 10.50, // per sq ft
      fair_condition: 15.00,
      poor_condition: 22.00
    },
    prep_work_hourly: 75
  }
} as const

export const MARKUP_TIERS = {
  RESIDENTIAL: {
    default: 25,
    premium: 35
  },
  COMMERCIAL: {
    default: 20,
    volume: 15
  },
  INDUSTRIAL: {
    default: 18,
    specialized: 30
  }
} as const

export const MINIMUM_JOB_VALUES = {
  insulation: 800,
  hvac: 2500,
  plaster: 500
} as const