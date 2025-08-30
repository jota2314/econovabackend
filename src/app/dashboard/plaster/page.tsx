"use client"

import { EstimateCard } from "@/components/dashboard/estimate-card"
import { Card } from "@/components/ui/card"
import { 
  PaintBucket,
  Home,
  Layers,
  Clock,
  Wrench,
  Square,
  TrendingUp,
  Settings
} from "lucide-react"

export default function PlasterDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plaster Dashboard</h1>
        <p className="text-slate-600">Monitor your plaster repair and restoration projects</p>
      </div>

      {/* Estimate Value Card for Plaster */}
      <EstimateCard 
        serviceType="plaster" 
        title="Plaster Estimate Value" 
      />

      {/* Plaster Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Plaster Jobs</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <PaintBucket className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Wall Area Restored</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Square Feet</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Square className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Repairs Completed</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Prep Time</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Hours</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Plaster Job Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Wall Condition Summary</h3>
            <Layers className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Excellent Condition</span>
              <span className="font-medium text-green-600">0 walls</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Good Condition</span>
              <span className="font-medium text-blue-600">0 walls</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Fair Condition</span>
              <span className="font-medium text-yellow-600">0 walls</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Poor Condition</span>
              <span className="font-medium text-red-600">0 walls</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Plaster Jobs</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="text-center py-8 text-slate-500">
            <Settings className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No plaster jobs to display yet</p>
          </div>
        </Card>
      </div>
    </div>
  )
}