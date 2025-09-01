import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getCurrentProfile } from "@/lib/auth"
import { ErrorBoundary } from "@/components/common/error-boundary"
import { redirect } from "next/navigation"

export default async function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  // Redirect unauthenticated users to login
  if (!profile) {
    redirect('/login')
  }

  // Provide user data
  const user = {
    name: profile.full_name || 'User',
    email: profile.email,
    avatar: undefined,
    role: profile.role
  }

  return (
    <ErrorBoundary>
      <DashboardLayout user={user}>
        {children}
      </DashboardLayout>
    </ErrorBoundary>
  )
}