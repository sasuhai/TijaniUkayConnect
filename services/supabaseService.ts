import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pztucbctmrbvrmpibwbf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dHVjYmN0bXJidnJtcGlid2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjY2MzEsImV4cCI6MjA3NzkwMjYzMX0.4EJmdYz4c3PWjJr3eCduJmV-7WzYpOgod1wHBs6_Qyc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
