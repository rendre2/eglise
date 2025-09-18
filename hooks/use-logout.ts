"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { toast } from "sonner"

export type LogoutOptions = {
  redirectTo?: string
  showToast?: boolean
  toastMessage?: string
  onBefore?: () => void
  onAfter?: () => void
}

/**
 * Centralized logout helper for the client.
 * - Calls NextAuth signOut
 * - Redirects to provided path (defaults to /auth/signin)
 * - Optional toast and lifecycle callbacks
 */
export function useLogout(defaults?: LogoutOptions) {
  const router = useRouter()

  const logout = useCallback(
    async (opts?: LogoutOptions) => {
      const {
        redirectTo = defaults?.redirectTo ?? "/auth/signin",
        showToast = defaults?.showToast ?? false,
        toastMessage = defaults?.toastMessage ?? "Vous avez été déconnecté.",
        onBefore = defaults?.onBefore,
        onAfter = defaults?.onAfter,
      } = opts || {}

      try {
        onBefore?.()
        if (showToast) toast.success(toastMessage)
        // Use NextAuth signOut to also clear server session cookies
        await signOut({ callbackUrl: redirectTo })
        // In most cases NextAuth will handle the redirect. The push below
        // is a safeguard if callback handling is blocked.
        router.push(redirectTo)
      } finally {
        onAfter?.()
      }
    },
    [router, defaults]
  )

  return { logout }
}
