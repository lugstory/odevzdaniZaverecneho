import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import GameCard from '../components/GameCard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mock data for featured games and categories
  const featuredGames = [
    { id: 1, name: 'Crash', category: 'Originals', thumbnail: '/images/crash.png' },
    { id: 2, name: 'Dice', category: 'Originals', thumbnail: '/images/dice.png' },
    { id: 3, name: 'Slots', category: 'Slots', thumbnail: '/images/slots1.png' },
    { id: 4, name: 'Blackjack', category: 'Table Games', thumbnail: '/images/blackjack.png' },
  ];

  const categories = [
    { name: 'Slots', games: [
      { id: 3, name: 'Slots', thumbnail: '/images/slots1.png' },
    ]},
    { name: 'Originals', games: [
      { id: 1, name: 'Crash', thumbnail: '/images/crash.png' },
      { id: 2, name: 'Dice', thumbnail: '/images/dice.png' },
    ]},
    { name: 'Table Games', games: [
      { id: 4, name: 'Blackjack', thumbnail: '/images/blackjack.png' },
    ]},
    { name: 'Live', games: [] },
    { name: 'New', games: [] },
  ];

  // Load user data and balance
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchBalance(userData.name);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchBalance = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/db?userId=${userId}&action=balance`);
      const data = await response.json();
      setBalance(data.balance);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setLoading(false);
    }
  };

  const updateBalanceOnServer = async (newBalance) => {
    if (user) {
      try {
        const response = await fetch('/api/db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.name,
            action: 'balance',
            amount: newBalance - balance
          }),
        });
        const data = await response.json();
        if (data.success) {
          setBalance(newBalance);
        }
      } catch (error) {
        console.error('Error updating balance:', error);
        // Re-fetch balance from server to ensure consistency
        fetchBalance(user.name);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setBalance(0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>PUPS Casino | Play with Virtual Coins</title>
      </Head>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            PUPS
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="bg-purple-600 px-3 py-1 rounded-full text-sm">
                  {loading ? 'Loading...' : `Balance: ${balance.toFixed(2)} ✧`}
                </span>
                <Link href="/leaderboard" className="hover:text-purple-400 transition">
                  Leaderboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative h-64 bg-gradient-to-r from-purple-900 to-pink-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold mb-2">Welcome to PUPS Casino</h1>
          <p className="text-xl text-gray-300">Play with virtual coins and win big!</p>
          {!user && (
            <Link href="/auth/register" className="mt-4 inline-block bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-lg font-semibold transition">
              Sign Up & Get 1000 Free Coins
            </Link>
          )}
        </div>
      </section>

      {/* Featured Games */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <span className="w-1 h-8 bg-purple-500 mr-3"></span>
          Featured Games
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* Game Categories */}
      {categories.map((category) => (
        <section key={category.name} className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="w-1 h-6 bg-pink-500 mr-3"></span>
            {category.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {category.games.map((game) => (
              <GameCard key={game.id} game={game} small />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
