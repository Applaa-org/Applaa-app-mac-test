import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFileSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select(`
        user_id,
        team_members (
          user_id,
          role,
          accepted_at
        )
      `)
      .eq('id', params.id)
      .single()

    if (appError) {
      if (appError.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 })
      }
      console.error('Error fetching app:', appError)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }

    const hasAccess = app.user_id === user.id || 
      app.team_members?.some((member: any) => 
        member.user_id === user.id && member.accepted_at
      )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: files, error } = await supabase
      .from('app_files')
      .select('id, path, size, mime_type, hash, created_at, updated_at')
      .eq('app_id', params.id)
      .order('path')

    if (error) {
      console.error('Error fetching files:', error)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error in GET /api/apps/[id]/files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has edit access to this app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select(`
        user_id,
        team_members (
          user_id,
          role,
          accepted_at
        )
      `)
      .eq('id', params.id)
      .single()

    if (appError) {
      if (appError.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 })
      }
      console.error('Error fetching app:', appError)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }

    const hasEditAccess = app.user_id === user.id || 
      app.team_members?.some((member: any) => 
        member.user_id === user.id && 
        ['owner', 'editor'].includes(member.role) &&
        member.accepted_at
      )

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createFileSchema.parse(body)

    const storageKey = `${params.id}/${validatedData.path}`
    const content = validatedData.content
    const size = new Blob([content]).size
    const hash = await generateFileHash(content)

    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from('app-files')
      .upload(storageKey, content, {
        contentType: validatedData.mime_type,
        upsert: true,
      })

    if (storageError) {
      console.error('Error uploading file:', storageError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create or update file record
    const { data: file, error: fileError } = await supabase
      .from('app_files')
      .upsert({
        app_id: params.id,
        path: validatedData.path,
        content: validatedData.mime_type.startsWith('text/') ? content : null,
        size,
        mime_type: validatedData.mime_type,
        hash,
        storage_path: storageKey,
      })
      .select()
      .single()

    if (fileError) {
      console.error('Error creating file record:', fileError)
      return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
    }

    return NextResponse.json({ file }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/apps/[id]/files:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}