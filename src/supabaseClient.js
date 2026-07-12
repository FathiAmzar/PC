import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjdqqfnefaczbtnnsvyy.supabase.co';
const supabaseAnonKey = 'sb_publishable_yaOdW4FJUFQVlvm3KjSlUw_CJcQ6rLd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
