// Re-export helpers for backwards compatibility.
// Server components: import { createClient } from '@/lib/supabase/server'
// Client components: import { createClient } from '@/lib/supabase/client'
export { createClient as createServerClient } from './supabase/server'
export { createClient as createBrowserClient } from './supabase/client'

import { createClient as _createAdmin } from '@supabase/supabase-js'

// Server-side admin client (use in API routes only)
export const supabaseAdmin = _createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
