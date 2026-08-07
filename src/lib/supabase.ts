import { createClient } from "@supabase/supabase-js";

// Publishable values — these are designed to be public and appear in browser network requests.
// Override via Vite env vars for different environments (e.g. staging vs production).
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://twkgdchvjepwrjqdbqgg.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2dkY2h2amVwd3JqcWRicWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc1NzgsImV4cCI6MjEwMTM0MzU3OH0.Xn7ELw-TuLH2X0_3xqHBCmcKcMj4Bu8chGerEJWMvts";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
