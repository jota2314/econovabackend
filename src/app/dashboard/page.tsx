import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  
  // Redirect non-managers to their appropriate pages
  if (profile?.role === 'salesperson') {
    redirect('/dashboard/jobs')
  } else if (profile?.role === 'lead_hunter') {
    redirect('/dashboard/leads')
  } else if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    // If no profile or unknown role, redirect to jobs
    redirect('/dashboard/jobs')
  }
  
  // Only managers and admins can see the dashboard
  return <DashboardContent />
}