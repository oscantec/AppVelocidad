import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggzibmendycytqafzxci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvH5aWjH1zabWFKnUlalsw_q7NaBNBz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TEMP_USER = 'oscar';
export const TEMP_PASS = '123';
