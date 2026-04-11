import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

console.log("Subscribing to Service...");
const channel = supabase.channel('test_channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'Service' }, payload => {
    console.log("Got payload!", payload);
  })
  .subscribe((status, err) => {
    console.log("Status:", status, err);
    if (status === 'SUBSCRIBED') process.exit(0);
    if (status === 'CHANNEL_ERROR') process.exit(1);
  });
