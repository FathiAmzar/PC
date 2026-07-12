import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjdqqfnefaczbtnnsvyy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZHFxZm5lZmFjemJ0bm5zdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODc5MjAsImV4cCI6MjA5OTM2MzkyMH0.qky5Zi2sxeIzmtN2ooQpcLqsLizzoyX5zLWNw76Bp0k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
