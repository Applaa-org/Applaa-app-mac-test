import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user profile exists, create if not
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          return NextResponse.redirect(`${origin}/auth/error`)
        }

        // Redirect to onboarding for new users
        return NextResponse.redirect(`${origin}/auth/onboarding`)
      }

      // Check if onboarding is completed
      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/auth/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}