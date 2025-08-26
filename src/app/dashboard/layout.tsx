import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getCurrentProfile } from "@/lib/auth"

export default async function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  // Provide default user data to prevent hydration mismatch
  const user = profile ? {
    name: profile.full_name || 'User',
    email: profile.email,
    avatar: undefined, // Remove avatar_url as it doesn't exist in the User type
    role: profile.role
  } : {
    name: 'Guest User',
    email: 'guest@sprayfoam.com',
    avatar: undefined,
    role: 'salesperson'
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}