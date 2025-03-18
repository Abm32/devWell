import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getGitHubToken } from '../lib/supabase';
import { githubService } from '../lib/github';
import { gitHubSyncService } from '../services/GitHubSyncService';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isInitializing: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshToken = async () => {
    try {
      await githubService.refreshToken();
      if (user) {
        await gitHubSyncService.syncCommits(user.id);
      }
      toast.success('Token refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh token');
      console.error('Token refresh error:', error);
    }
  };

  const initializeGitHub = async (session: any) => {
    try {
      await githubService.initialize();
      const token = await getGitHubToken();
      if (!token) {
        throw new Error('No GitHub token available');
      }
      
      // Sync commits after successful initialization
      if (session.user) {
        await gitHubSyncService.syncCommits(session.user.id);
      }
      
      return true;
    } catch (error) {
      console.error('GitHub initialization error:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session && mounted) {
          setUser(session.user);
          const githubInitialized = await initializeGitHub(session);
          if (!githubInitialized) {
            toast.error('Failed to initialize GitHub integration');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        toast.error('Failed to initialize authentication');
      } finally {
        if (mounted) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (session) {
          setUser(session.user);
          const githubInitialized = await initializeGitHub(session);
          if (githubInitialized) {
            toast.success('Successfully authenticated with GitHub');
          } else {
            toast.error('GitHub integration failed');
          }
        } else {
          setUser(null);
          toast.success('Successfully signed out');
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        toast.error('Authentication state change failed');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo user',
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        if (error.message.includes('popup')) {
          toast.error('Please allow popups for GitHub authentication');
        } else {
          toast.error(`Authentication failed: ${error.message}`);
        }
        throw error;
      }
    } catch (error) {
      console.error('GitHub sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isInitializing,
      signInWithGitHub, 
      signOut,
      refreshToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};