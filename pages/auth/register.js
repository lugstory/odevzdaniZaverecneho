import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simple validation
    if (!email || !username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Extract username from email if username is not provided
    const finalUsername = username || email.split('@')[0];

    if (!finalUsername) {
      setError('Invalid email format');
      setLoading(false);
      return;
    }

    try {
      // Create user in database
      const response = await fetch('/api/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: finalUsername,
          amount: 1000 // Initial balance
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const data = await response.json();

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify({
        name: finalUsername,
        email: email
      }));

      // Store initial balance in localStorage
      localStorage.setItem('balance', data.balance.toString());

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-400">Register</h1>
        <p className="text-center text-gray-300 mb-6">Sign up and get 1000 free coins!</p>

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
            <label htmlFor="username" className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            {loading ? 'Registering...' : 'Register & Get 1000 Free Coins'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-purple-400 hover:text-purple-300">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
