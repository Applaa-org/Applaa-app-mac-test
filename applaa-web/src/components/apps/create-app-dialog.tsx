'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createAppSchema, type CreateAppInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Smartphone, Globe, Zap } from 'lucide-react'

interface CreateAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAppCreated: (appId: string) => void
}

const appTypes = [
  {
    value: 'web' as const,
    label: 'Web App',
    description: 'React/Next.js web application',
    icon: Globe,
  },
  {
    value: 'expo' as const,
    label: 'Expo App',
    description: 'React Native mobile app',
    icon: Smartphone,
  },
  {
    value: 'flutter' as const,
    label: 'Flutter App',
    description: 'Cross-platform mobile app',
    icon: Zap,
  },
]

export function CreateAppDialog({ open, onOpenChange, onAppCreated }: CreateAppDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateAppInput>({
    resolver: zodResolver(createAppSchema),
    defaultValues: {
      type: 'web',
    },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: CreateAppInput) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create app')
      }

      const result = await response.json()
      onAppCreated(result.app.id)
      reset()
    } catch (error) {
      console.error('Error creating app:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New App</DialogTitle>
          <DialogDescription>
            Choose your app type and provide basic information to get started.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">App Name</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what your app does..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>App Type</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setValue('type', value as any)}
              className="grid grid-cols-1 gap-4"
            >
              {appTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label
                      htmlFor={type.value}
                      className="flex items-center space-x-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                'Create App'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}