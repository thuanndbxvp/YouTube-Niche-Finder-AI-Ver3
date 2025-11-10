import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uutavlitlxevsaxiymtk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1dGF2bGl0bHhldnNheGl5bXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTU0NTQsImV4cCI6MjA3ODMzMTQ1NH0.IHl-qFdfjibndAK5R4b2xeW5Ucx4xSnDSibXEXbwfx4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
