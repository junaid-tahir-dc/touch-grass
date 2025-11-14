// import "https://deno.land/x/xhr@0.1.0/mod.ts";
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// interface PushPayload {
//   title: string;
//   body: string;
//   icon?: string;
//   badge?: string;
//   tag?: string;
//   data?: any;
//   actions?: Array<{
//     action: string;
//     title: string;
//     icon?: string;
//   }>;
// }

// interface NotificationRequest {
//   userIds: string[];
//   payload: PushPayload;
// }

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     console.log('Push notification request received');
    
//     const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
//     const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
//     const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
//     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

//     if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
//       console.error('VAPID keys not configured');
//       return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
//       console.error('Supabase credentials not configured');
//       return new Response(JSON.stringify({ error: 'Database not configured' }), {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // Create Supabase client with service role
//     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

//     const { userIds, payload }: NotificationRequest = await req.json();
//     console.log('Sending push notifications to users:', userIds);

//     if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
//       return new Response(JSON.stringify({ error: 'Invalid or empty userIds array' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // Get push subscriptions for the specified users
//     const { data: subscriptions, error: fetchError } = await supabase
//       .from('push_subscriptions')
//       .select('*')
//       .in('user_id', userIds);

//     if (fetchError) {
//       console.error('Error fetching subscriptions:', fetchError);
//       return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     if (!subscriptions || subscriptions.length === 0) {
//       console.log('No push subscriptions found for users:', userIds);
//       return new Response(JSON.stringify({ 
//         message: 'No subscriptions found',
//         sent: 0,
//         failed: 0
//       }), {
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     console.log(`Found ${subscriptions.length} subscriptions`);

//     // Create VAPID headers
//     const vapidKeys = {
//       publicKey: VAPID_PUBLIC_KEY,
//       privateKey: VAPID_PRIVATE_KEY,
//     };

//     // Helper function to generate VAPID headers
//     const generateVAPIDHeaders = (endpoint: string) => {
//       // Extract audience from endpoint
//       const url = new URL(endpoint);
//       const audience = `${url.protocol}//${url.host}`;
      
//       // Create JWT payload
//       const now = Math.floor(Date.now() / 1000);
//       const header = {
//         typ: 'JWT',
//         alg: 'ES256'
//       };
      
//       const jwtPayload = {
//         aud: audience,
//         exp: now + 12 * 60 * 60, // 12 hours
//         sub: 'mailto:support@touchgrass.app'
//       };

//       // For simplicity, we'll use a basic implementation
//       // In production, you'd want to use a proper JWT library
//       const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
//       const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
//       // This is a simplified version - in production use a proper ECDSA signing library
//       const token = `${headerB64}.${payloadB64}.signature`;
      
//       return {
//         'Authorization': `vapid t=${token}, k=${vapidKeys.publicKey}`,
//         'Crypto-Key': `p256ecdsa=${vapidKeys.publicKey}`,
//       };
//     };

//     // Send notifications to all subscriptions
//     const results = await Promise.allSettled(
//       subscriptions.map(async (subscription) => {
//         try {
//           console.log(`Sending push to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
          
//           const notificationPayload = JSON.stringify(payload);
          
//           const headers = {
//             'Content-Type': 'application/json',
//             'Content-Length': notificationPayload.length.toString(),
//             'TTL': '86400', // 24 hours
//             ...generateVAPIDHeaders(subscription.endpoint),
//           };

//           const response = await fetch(subscription.endpoint, {
//             method: 'POST',
//             headers,
//             body: notificationPayload,
//           });

//           if (!response.ok) {
//             const errorText = await response.text();
//             console.error(`Push failed for ${subscription.user_id}:`, response.status, errorText);
            
//             // Remove invalid subscriptions
//             if (response.status === 410 || response.status === 404) {
//               console.log(`Removing invalid subscription for user ${subscription.user_id}`);
//               await supabase
//                 .from('push_subscriptions')
//                 .delete()
//                 .eq('id', subscription.id);
//             }
            
//             throw new Error(`Push failed: ${response.status} ${errorText}`);
//           }

//           console.log(`Push sent successfully to user ${subscription.user_id}`);
//           return { success: true, userId: subscription.user_id };
//         } catch (error) {
//           console.error(`Error sending push to user ${subscription.user_id}:`, error);
//           const errorMessage = error instanceof Error ? error.message : String(error);
//           return { success: false, userId: subscription.user_id, error: errorMessage };
//         }
//       })
//     );

//     const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
//     const failed = results.length - successful;

//     console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

//     return new Response(JSON.stringify({
//       message: 'Push notifications processed',
//       sent: successful,
//       failed: failed,
//       results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
//     }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });

//   } catch (error) {
//     console.error('Error in send-push-notification function:', error);
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     return new Response(JSON.stringify({ 
//       error: 'Internal server error',
//       message: errorMessage 
//     }), {
//       status: 500,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });
//   }
// });