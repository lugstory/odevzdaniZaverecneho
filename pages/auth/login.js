import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simple validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    // Extract username from email
    const username = email.split('@')[0];

    if (!username) {
      setError('Invalid email format');
      setLoading(false);
      return;
    }

    try {
      // Check if user exists in database
      const response = await fetch(`/api/balance?userId=${username}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify({
        name: username,
        email: email
      }));

      // Store balance in localStorage
      localStorage.setItem('balance', data.balance.toString());

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-400">Login</h1>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-purple-400 hover:text-purple-300">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
