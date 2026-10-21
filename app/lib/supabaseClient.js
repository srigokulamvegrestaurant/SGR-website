// lib/supabaseClient.js - Supabase Client Initialization for Sri Gokulam Veg Restaurant
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oolonnixnuherowpodla.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseKey);
