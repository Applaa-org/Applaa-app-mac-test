import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateAppSchema } from '@/lib/validations'

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

    const { data: app, error } = await supabase
      .from('apps')
      .select(`
        *,
        dev_environments (
          id,
          status,
          preview_url,
          port
        ),
        team_members (
          id,
          user_id,
          role,
          users (
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 })
      }
      console.error('Error fetching app:', error)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }

    // Check if user has access to this app
    const hasAccess = app.user_id === user.id || 
      app.team_members?.some((member: any) => 
        member.user_id === user.id && member.accepted_at
      )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ app })
  } catch (error) {
    console.error('Error in GET /api/apps/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAppSchema.parse(body)

    // Check if user owns the app or has editor access
    const { data: app, error: fetchError } = await supabase
      .from('apps')
      .select(`
        *,
        team_members!inner (
          user_id,
          role
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 })
      }
      console.error('Error fetching app:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }

    const hasEditAccess = app.user_id === user.id || 
      app.team_members?.some((member: any) => 
        member.user_id === user.id && 
        ['owner', 'editor'].includes(member.role)
      )

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('apps')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating app:', updateError)
      return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
    }

    return NextResponse.json({ app: updatedApp })
  } catch (error) {
    console.error('Error in PUT /api/apps/[id]:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns the app
    const { data: app, error: fetchError } = await supabase
      .from('apps')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 })
      }
      console.error('Error fetching app:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 })
    }

    if (app.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete app files from storage
    const { data: files } = await supabase
      .from('app_files')
      .select('storage_path')
      .eq('app_id', params.id)

    if (files && files.length > 0) {
      const filePaths = files.map(file => file.storage_path)
      const { error: storageError } = await supabase.storage
        .from('app-files')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
      }
    }

    // Delete the app (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('apps')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting app:', deleteError)
      return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/apps/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}