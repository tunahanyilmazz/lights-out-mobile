// Supabase konfigürasyon dosyası
import { createClient } from '@supabase/supabase-js';

// Supabase konfigürasyonu
const supabaseUrl = 'https://scforxihjntkjrlhmpfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZm9yeGloam50a2pybGhtcGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTgzNDMsImV4cCI6MjA3MjY3NDM0M30.FeQGXRvLoHJv98B3gtmPp6Yl97zmJ3GuzrB_VIrsIuY';

// Supabase client oluştur
export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
