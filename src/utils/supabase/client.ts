import { createBrowserClient } from '@supabase/ssr'

export function createClient(remember: boolean = true) {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                storage: remember ? (typeof window !== 'undefined' ? window.localStorage : undefined) : (typeof window !== 'undefined' ? window.sessionStorage : undefined),
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    )
}
