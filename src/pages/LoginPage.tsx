import { useState } from 'react';
import { motion } from 'motion/react';
import { Wand2, LogIn } from 'lucide-react';
import { loginWithGoogle } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, isAdmin, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user && isAdmin) return <Navigate to="/admin" />;

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for login. Please add the Shared App URL to your Firebase Console (Authentication -> Settings -> Authorized Domains).");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-zinc-900 p-10 rounded-3xl border border-white/10 text-center"
      >
        <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <Wand2 className="text-purple-500 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Portal</h1>
        <p className="text-white/50 mb-10">Sign in to manage your magic team's content.</p>

        {user && !isAdmin && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
            Access Denied. Only authorized administrators can enter.
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-purple-500 hover:text-white transition-all"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );
}
