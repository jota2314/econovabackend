"use client"

import { EstimateCard } from "@/components/dashboard/estimate-card"
import { Card } from "@/components/ui/card"
import { 
  Thermometer, 
  Wind, 
  Wrench, 
  Home,
  TrendingUp,
  Clock,
  DollarSign,
  Settings
} from "lucide-react"

export default function HVACDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">HVAC Dashboard</h1>
        <p className="text-slate-600">Monitor your HVAC service performance and estimates</p>
      </div>

      {/* Estimate Value Card for HVAC */}
      <EstimateCard 
        serviceType="hvac" 
        title="HVAC Estimate Value" 
      />

      {/* HVAC Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active HVAC Jobs</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Thermometer className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Systems Installed</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Wind className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Service Calls</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg System Size</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Tons</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Home className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent HVAC Jobs */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent HVAC Jobs</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
        </div>
        <div className="text-center py-8 text-slate-500">
          <Settings className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>No HVAC jobs to display yet</p>
        </div>
      </Card>
    </div>
  )
}