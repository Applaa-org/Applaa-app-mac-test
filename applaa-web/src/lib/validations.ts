import { z } from 'zod'

export const createAppSchema = z.object({
  name: z.string().min(1, 'App name is required').max(100, 'App name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['web', 'expo', 'flutter']),
  template_id: z.string().optional(),
})

export const updateAppSchema = z.object({
  name: z.string().min(1, 'App name is required').max(100, 'App name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  status: z.enum(['creating', 'ready', 'building', 'error']).optional(),
  preview_url: z.string().url().optional(),
  repository_url: z.string().url().optional(),
  deployment_url: z.string().url().optional(),
})

export const createFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string(),
  mime_type: z.string().default('text/plain'),
})

export const updateFileSchema = z.object({
  content: z.string(),
})

export const createChatSchema = z.object({
  title: z.string().min(1, 'Chat title is required').max(200, 'Title too long'),
  agent_type: z.string().optional(),
})

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  role: z.enum(['user', 'assistant']),
  metadata: z.record(z.any()).optional(),
})

export const skillAssessmentSchema = z.object({
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),
  answers: z.record(z.number()),
})

export const updateProfileSchema = z.object({
  full_name: z.string().max(100, 'Name too long').optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})

export const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']),
})

export type CreateAppInput = z.infer<typeof createAppSchema>
export type UpdateAppInput = z.infer<typeof updateAppSchema>
export type CreateFileInput = z.infer<typeof createFileSchema>
export type UpdateFileInput = z.infer<typeof updateFileSchema>
export type CreateChatInput = z.infer<typeof createChatSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type SkillAssessmentInput = z.infer<typeof skillAssessmentSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>