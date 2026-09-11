import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const url = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '')

export const isDemoMode =
  !url ||
  !key ||
  url.includes('YOUR_PROJECT')

export const supabase = isDemoMode
  ? null
  : createClient(url, key)