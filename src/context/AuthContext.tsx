import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { today } from '../lib/dateUtils'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getLocalProfile(): Profile {
  const todayStr = today()
  if (typeof window === 'undefined') {
    return {
      id: 'local-warrior',
      display_name: 'Warrior',
      start_date: todayStr,
      duration_days: 90,
      threshold: 80,
      privacy_mode: false,
    }
  }
  const saved = localStorage.getItem('wa_real_profile')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch {}
  }
  const initial: Profile = {
    id: 'local-warrior',
    display_name: 'Warrior',
    start_date: todayStr,
    duration_days: 90,
    threshold: 80,
    privacy_mode: false,
  }
  localStorage.setItem('wa_real_profile', JSON.stringify(initial))
  return initial
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(() => getLocalProfile())
  const [loading, setLoading] = useState(true)

  /** Fetch or create the user's profile row in Supabase without overwriting existing settings */
  async function loadProfile(userId: string) {
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (fetchErr) {
      console.warn('Error loading profile from Supabase:', fetchErr.message)
    }

    if (existing) {
      // Keep exact values from database — do NOT overwrite start_date!
      setProfile(existing as Profile)
      localStorage.setItem('wa_real_profile', JSON.stringify(existing))
      return
    }

    // Only create default profile if user does not exist in profiles table yet
    const displayName =
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Warrior'

    const newProfile: Record<string, unknown> = {
      id: userId,
      display_name: displayName,
      start_date: today(),
      duration_days: 90,
      threshold: 80,
      privacy_mode: false,
    }

    let { data: created, error: pErr } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .maybeSingle()

    // Fallback if display_name column has not been added in database yet
    if (pErr && pErr.message?.includes('display_name')) {
      delete newProfile.display_name
      const res = await supabase.from('profiles').insert(newProfile).select().maybeSingle()
      created = res.data
    }

    if (created) {
      setProfile(created as Profile)
      localStorage.setItem('wa_real_profile', JSON.stringify(created))
    } else {
      setProfile(getLocalProfile())
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    setProfile(prev => {
      const next = { ...(prev || getLocalProfile()), ...updates }
      localStorage.setItem('wa_real_profile', JSON.stringify(next))
      return next
    })

    if (user) {
      const payload: Record<string, unknown> = { ...updates }
      let { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .maybeSingle()

      if (error && error.message?.includes('display_name')) {
        delete payload.display_name
        const res = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select()
          .maybeSingle()
        data = res.data
      }

      if (data) {
        setProfile(data as Profile)
        localStorage.setItem('wa_real_profile', JSON.stringify(data))
      }
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id)
    } else {
      setProfile(getLocalProfile())
    }
  }

  useEffect(() => {
    // Clear legacy mock demo flags so user always runs real Day 1 tracker
    localStorage.removeItem('wa_demo')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setProfile(getLocalProfile())
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(getLocalProfile())
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription for profile changes in Supabase
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`profile-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        payload => {
          if (payload.new) {
            setProfile(payload.new as Profile)
            localStorage.setItem('wa_real_profile', JSON.stringify(payload.new))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(getLocalProfile())
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
