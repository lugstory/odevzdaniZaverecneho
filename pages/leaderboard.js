import { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/db?action=all');
        const data = await response.json();
        
        if (response.ok) {
          // Get top 10 players
          const topPlayers = data.users.slice(0, 10);
          setPlayers(topPlayers);
        } else {
          setError(data.error || 'Failed to fetch leaderboard');
        }
      } catch (err) {
        setError('Failed to fetch leaderboard');
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <div className="text-gray-400">
            Top 10 Players by Balance
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No players found on the leaderboard yet.
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player, index) => (
                <div 
                  key={player.userId} 
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index < 3 
                      ? index === 0 ? 'bg-yellow-600/20 border border-yellow-600/50' :
                        index === 1 ? 'bg-gray-600/20 border border-gray-400/50' :
                        'bg-orange-600/20 border border-orange-600/50'
                      : 'bg-gray-700/50 border border-gray-600/30'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index < 3 
                        ? index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          'bg-orange-500 text-black'
                        : 'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="font-semibold">{player.userId}</div>
                  </div>
                  <div className="text-xl font-bold text-yellow-400">
                    {player.balance.toFixed(2)} ✧
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
