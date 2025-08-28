'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Play, Settings } from 'lucide-react'

interface App {
  id: string
  name: string
  description: string | null
  type: 'web' | 'expo' | 'flutter'
  status: 'creating' | 'ready' | 'building' | 'error'
  preview_url: string | null
  deployment_url: string | null
  created_at: string
  updated_at: string
  dev_environments?: {
    id: string
    status: 'starting' | 'running' | 'stopped' | 'error'
    preview_url: string | null
  }[]
}

interface AppsListProps {
  apps: App[]
}

export function AppsList({ apps }: AppsListProps) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No apps yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first application.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <Card key={app.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{app.name}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant={getAppTypeVariant(app.type)}>
                  {app.type}
                </Badge>
                <Badge variant={getStatusVariant(app.status)}>
                  {app.status}
                </Badge>
              </div>
            </div>
            {app.description && (
              <CardDescription className="line-clamp-2">
                {app.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                <p>Created {formatDate(app.created_at)}</p>
                <p>Updated {formatDate(app.updated_at)}</p>
              </div>

              {app.dev_environments?.[0] && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Dev Environment:</span>
                  <Badge variant={getDevStatusVariant(app.dev_environments[0].status)}>
                    {app.dev_environments[0].status}
                  </Badge>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/apps/${app.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Open
                  </Link>
                </Button>

                {app.dev_environments?.[0]?.preview_url && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={app.dev_environments[0].preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Preview
                    </a>
                  </Button>
                )}

                {app.deployment_url && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={app.deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Live
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getAppTypeVariant(type: string) {
  switch (type) {
    case 'web':
      return 'default'
    case 'expo':
      return 'secondary'
    case 'flutter':
      return 'outline'
    default:
      return 'default'
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'ready':
      return 'default'
    case 'creating':
    case 'building':
      return 'secondary'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getDevStatusVariant(status: string) {
  switch (status) {
    case 'running':
      return 'default'
    case 'starting':
      return 'secondary'
    case 'stopped':
      return 'outline'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}