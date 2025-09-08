"use client"

import { useState, useEffect } from "react"
import { EstimateCard } from "@/components/dashboard/estimate-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedHvacMeasurement } from "@/components/measurements/services/hvac/EnhancedHvacMeasurement"
import { 
  Thermometer, 
  Wind, 
  Wrench, 
  Home,
  TrendingUp,
  Clock,
  DollarSign,
  Settings,
  Plus,
  FileText,
  Calculator
} from "lucide-react"
import { toast } from "sonner"

export default function HVACDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Mock job data - in real app this would come from API
  const mockJob = {
    id: 'demo-hvac-job',
    service_type: 'hvac' as const,
    construction_type: 'new_construction' as const
  }

  const handleEstimateGenerate = async (measurements: any[], summary: any) => {
    toast.success(`Professional HVAC estimate generated for ${measurements.length} systems`)
  }

  const handlePdfGenerate = async (measurements: any[], summary: any) => {
    toast.success('HVAC proposal PDF generated successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Professional HVAC Systems</h1>
          <p className="text-slate-600">Professional HVAC measurement and pricing system</p>
        </div>
        <Button 
          onClick={() => setActiveTab('measurements')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New HVAC Project
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            HVAC Systems
          </TabsTrigger>
          <TabsTrigger value="estimates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Estimates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">

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
        </TabsContent>

        {/* Enhanced HVAC Measurements Tab */}
        <TabsContent value="measurements">
          <EnhancedHvacMeasurement
            jobId={mockJob.id}
            onEstimateGenerate={handleEstimateGenerate}
            onPdfGenerate={handlePdfGenerate}
            isManager={true}
            showPricing={true}
            showEstimateActions={true}
            showPhotos={true}
            showValidation={true}
          />
        </TabsContent>

        {/* Estimates Tab */}
        <TabsContent value="estimates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                HVAC Estimates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Generated HVAC estimates will appear here</p>
                <Button 
                  onClick={() => setActiveTab('measurements')} 
                  variant="outline" 
                  className="mt-4"
                >
                  Create HVAC Systems
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}