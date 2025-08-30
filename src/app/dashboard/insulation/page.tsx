"use client"

import { EstimateCard } from "@/components/dashboard/estimate-card"
import { Card } from "@/components/ui/card"
import { 
  Home,
  Layers,
  Ruler,
  TrendingUp,
  Package,
  BarChart3,
  Clock,
  Settings
} from "lucide-react"

export default function InsulationDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insulation Dashboard</h1>
        <p className="text-slate-600">Track your spray foam insulation projects and estimates</p>
      </div>

      {/* Estimate Value Card for Insulation */}
      <EstimateCard 
        serviceType="insulation" 
        title="Insulation Estimate Value" 
      />

      {/* Insulation Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Insulation Jobs</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Square Feet</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Ruler className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Foam Used</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Gallons</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg R-Value</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Achieved</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Insulation Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Insulation Types Used</h3>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Closed Cell</span>
              <span className="font-medium">0 jobs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Open Cell</span>
              <span className="font-medium">0 jobs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Hybrid System</span>
              <span className="font-medium">0 jobs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Batt Insulation</span>
              <span className="font-medium">0 jobs</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Insulation Jobs</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="text-center py-8 text-slate-500">
            <Settings className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No insulation jobs to display yet</p>
          </div>
        </Card>
      </div>
    </div>
  )
}