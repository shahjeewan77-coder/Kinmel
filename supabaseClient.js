import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ltclcbfbshxqhqvbcugq.supabase.co'
const supabaseAnonKey = 'sb_publishable_YCmnA7BQB43LZtaSW_q4tg_yxJ0LF5S'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)