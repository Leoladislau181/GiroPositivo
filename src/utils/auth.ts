import { supabase } from '../supabaseClient';
import { User } from '../src/types';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
    };
  },

  async login(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) return null;

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  },

  async signup(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) return null;

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
