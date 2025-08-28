import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateFileSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = params.path.join('/')

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

    // Get file metadata
    const { data: fileRecord, error: fileError } = await supabase
      .from('app_files')
      .select('*')
      .eq('app_id', params.id)
      .eq('path', filePath)
      .single()

    if (fileError) {
      if (fileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      console.error('Error fetching file:', fileError)
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
    }

    // If it's a text file and content is cached, return it
    if (fileRecord.content) {
      return NextResponse.json({
        file: {
          ...fileRecord,
          content: fileRecord.content,
        }
      })
    }

    // Otherwise, get from storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('app-files')
      .download(fileRecord.storage_path)

    if (storageError) {
      console.error('Error downloading file:', storageError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    const content = await storageData.text()

    return NextResponse.json({
      file: {
        ...fileRecord,
        content,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/apps/[id]/files/[...path]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = params.path.join('/')

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
    const validatedData = updateFileSchema.parse(body)

    // Get existing file record
    const { data: existingFile, error: fetchError } = await supabase
      .from('app_files')
      .select('*')
      .eq('app_id', params.id)
      .eq('path', filePath)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      console.error('Error fetching file:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
    }

    const content = validatedData.content
    const size = new Blob([content]).size
    const hash = await generateFileHash(content)

    // Update storage
    const { error: storageError } = await supabase.storage
      .from('app-files')
      .update(existingFile.storage_path, content, {
        contentType: existingFile.mime_type,
        upsert: true,
      })

    if (storageError) {
      console.error('Error updating file in storage:', storageError)
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
    }

    // Update file record
    const { data: updatedFile, error: updateError } = await supabase
      .from('app_files')
      .update({
        content: existingFile.mime_type.startsWith('text/') ? content : null,
        size,
        hash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingFile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating file record:', updateError)
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
    }

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    console.error('Error in PUT /api/apps/[id]/files/[...path]:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = params.path.join('/')

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

    // Get file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from('app_files')
      .select('*')
      .eq('app_id', params.id)
      .eq('path', filePath)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      console.error('Error fetching file:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('app-files')
      .remove([fileRecord.storage_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
    }

    // Delete file record
    const { error: deleteError } = await supabase
      .from('app_files')
      .delete()
      .eq('id', fileRecord.id)

    if (deleteError) {
      console.error('Error deleting file record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/apps/[id]/files/[...path]:', error)
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