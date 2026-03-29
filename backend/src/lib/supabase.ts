import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.BRIDEE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.BRIDEE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required env vars: BRIDEE_SUPABASE_URL and BRIDEE_SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
