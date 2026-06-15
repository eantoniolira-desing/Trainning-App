'use client'

import { useEffect } from 'react'
import { syncFromSupabase } from '@/lib/db'

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    syncFromSupabase()
  }, [])

  return <>{children}</>
}
