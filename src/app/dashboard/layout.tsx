import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getCurrentProfile } from "@/lib/auth"

export default async function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  const user = profile ? {
    name: profile.full_name || 'User',
    email: profile.email,
    avatar: profile.avatar_url,
    role: profile.role
  } : undefined

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  )
}