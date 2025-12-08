import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client for development when env vars are not set
const createMockClient = () => {
  const mockErrorResponse = { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
  
  // Create a chainable query builder that returns promises
  const createChainable = (operationType: 'select' | 'insert' | 'update' | 'delete' = 'select') => {
    const chainable: any = {
      select: () => {
        // Keep the original operation type even after select() is called
        // This handles .insert().select().single() pattern
        return createChainable(operationType);
      },
      insert: (data?: any) => {
        // For inserts, return a chainable that will resolve with mock data
        return createChainable('insert');
      },
      update: (data?: any) => {
        // For updates, return a chainable that will resolve with mock data
        return createChainable('update');
      },
      delete: () => createChainable('delete'),
      eq: () => chainable,
      is: () => chainable,
      order: () => chainable,
      limit: () => chainable,
      single: () => {
        // For single(), return PGRST116 error (not found) for selects, success for inserts/updates
        if (operationType === 'insert' || operationType === 'update') {
          return Promise.resolve({ data: { id: 'mock-session-id' }, error: null });
        }
        // For select queries, return "not found" error (which is expected and handled)
        return Promise.resolve(mockErrorResponse);
      },
      maybeSingle: () => {
        // For maybeSingle(), return null data (no error)
        return Promise.resolve({ data: null, error: null });
      },
    };
    
    // Make it thenable (promise-like) for direct promise access
    chainable.then = (onResolve: any, onReject?: any) => {
      if (operationType === 'insert' || operationType === 'update') {
        return Promise.resolve({ data: { id: 'mock-session-id' }, error: null }).then(onResolve, onReject);
      }
      return Promise.resolve(mockErrorResponse).then(onResolve, onReject);
    };
    
    return chainable;
  };
  
  return {
    from: () => createChainable('select'),
    rpc: () => Promise.resolve(0), // Return 0 gems for RPC calls
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

