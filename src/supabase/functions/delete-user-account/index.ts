// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, OPTIONS',
// }

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     // Create Supabase client with service role key for admin operations
//     const supabaseAdmin = createClient(
//       Deno.env.get('SUPABASE_URL') ?? '',
//       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
//       {
//         auth: {
//           autoRefreshToken: false,
//           persistSession: false
//         }
//       }
//     )

//     // Try to read body (may be empty)
//     let body: any = null
//     try {
//       body = await req.json()
//     } catch (_) {
//       body = null
//     }

//     // Get the authorization header or token from body
//     const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
//     const bodyToken = typeof body?.token === 'string' ? body.token : ''
//     const tokenSource = authHeader ? 'header' : (bodyToken ? 'body' : 'none')
//     const jwt = (authHeader || bodyToken).replace(/^Bearer\s+/i, '').trim()

//     console.log('delete-user-account: tokenSource=', tokenSource, 'tokenLength=', jwt?.length || 0)

//     if (!jwt) {
//       return new Response(
//         JSON.stringify({ success: false, error: 'Missing authentication token' }),
//         {
//           status: 200,
//           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//         }
//       )
//     }

//     // Verify the JWT token using admin client
//     const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
//     if (userError || !user) {
//       console.error('User verification failed:', userError)
//       return new Response(
//         JSON.stringify({ success: false, error: 'Invalid authentication' }),
//         {
//           status: 200,
//           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//         }
//       )
//     }

//     const userId = user.id
//     console.log(`Attempting to delete user account: ${userId}`)

//     // Pre-delete dependent data to avoid FK/constraint errors
//     const tablesToDelete = [
//       { table: 'post_likes', column: 'user_id' },
//       { table: 'comments', column: 'user_id' },
//       { table: 'messages', column: 'user_id' },
//       { table: 'chat_participants', column: 'user_id' },
//       { table: 'user_challenge_sessions', column: 'user_id' },
//       { table: 'push_subscriptions', column: 'user_id' },
//       { table: 'posts', column: 'user_id' },
//       { table: 'user_roles', column: 'user_id' },
//       { table: 'user_profiles', column: 'user_id' },
//     ] as const

//     for (const t of tablesToDelete) {
//       const { error } = await supabaseAdmin.from(t.table as any).delete().eq(t.column, userId)
//       if (error) {
//         console.warn(`Cleanup warning: failed to delete from ${t.table}`, error)
//       }
//     }

//     // Nullify creator on chats/content if any
//     await supabaseAdmin.from('chats' as any).update({ created_by: null }).eq('created_by', userId)
//     await supabaseAdmin.from('content' as any).update({ author_id: null }).eq('author_id', userId)

//     // Delete the user account using admin privileges
//     const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
//     if (deleteError) {
//       console.error('Error deleting user:', deleteError)
//       return new Response(
//         JSON.stringify({ success: false, error: deleteError.message }),
//         {
//           status: 200,
//           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//         }
//       )
//     }

//     console.log(`Successfully deleted user account: ${userId}`)

//     return new Response(
//       JSON.stringify({ success: true, message: 'Account deleted successfully' }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )

//   } catch (error) {
//     console.error('Unexpected error in delete-user-account function:', error)
//     return new Response(
//       JSON.stringify({ error: 'Internal server error' }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )
//   }
// })