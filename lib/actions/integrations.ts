'use server'

import { isDineroConfigured } from '@/lib/dinero/client'

export async function getDineroStatus() {
  return {
    configured: isDineroConfigured(),
    hasClientId: !!process.env.DINERO_CLIENT_ID,
    hasRedirectUri: !!process.env.DINERO_REDIRECT_URI,
  }
}
