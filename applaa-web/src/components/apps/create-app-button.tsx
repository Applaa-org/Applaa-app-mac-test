'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateAppDialog } from './create-app-dialog'
import { Plus } from 'lucide-react'

export function CreateAppButton() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleAppCreated = (appId: string) => {
    setIsOpen(false)
    router.push(`/dashboard/apps/${appId}`)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New App
      </Button>
      <CreateAppDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onAppCreated={handleAppCreated}
      />
    </>
  )
}