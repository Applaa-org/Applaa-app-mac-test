import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { AppsList } from '@/components/apps/apps-list'
import { CreateAppButton } from '@/components/apps/create-app-button'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = createClient()

  const { data: apps, error } = await supabase
    .from('apps')
    .select(`
      *,
      dev_environments (
        id,
        status,
        preview_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching apps:', error)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Apps</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage your applications
            </p>
          </div>
          <CreateAppButton />
        </div>
      </div>

      <AppsList apps={apps || []} />
    </div>
  )
}