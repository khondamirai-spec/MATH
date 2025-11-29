import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client for development when env vars are not set
const createMockClient = () => {
  const mockResponse = { data: null, error: null };
  const chainable = {
    select: () => chainable,
    insert: () => chainable,
    update: () => chainable,
    delete: () => chainable,
    eq: () => chainable,
    is: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    single: () => Promise.resolve(mockResponse),
    then: (resolve: (value: typeof mockResponse) => void) => Promise.resolve(mockResponse).then(resolve),
  };
  
  return {
    from: () => chainable,
  } as unknown as SupabaseClient;
};

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Missing Supabase environment variables. Running in offline mode. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local for full functionality.'
  );
  supabase = createMockClient();
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

