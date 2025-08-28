import { requireProfile } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireProfile()
  
  if (!profile.onboarding_completed) {
    redirect('/auth/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={profile} />
      <main className="py-6">
        {children}
      </main>
    </div>
  )
}