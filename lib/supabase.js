import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null quando o .env.local ainda não está configurado
export const supabase = url && key ? createClient(url, key) : null;
