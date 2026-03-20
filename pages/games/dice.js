import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DiceGame() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [autoBet, setAutoBet] = useState(false);
  const [autoBetCount, setAutoBetCount] = useState(0);
  const [autoBetTarget, setAutoBetTarget] = useState(50);
  const [autoBetAmount, setAutoBetAmount] = useState('');
  const [autoBetRuns, setAutoBetRuns] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const maxBet = 1000;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchBalance(userData.name);
      loadBetHistory(userData.name);
    } else {
      router.push('/auth/login');
    }
  }, [router]);

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

  const updateBalance = async (newBalance) => {
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
  };

  const loadBetHistory = async (userId) => {
    try {
      const response = await fetch(`/api/db?userId=${userId}&action=history`);
      const data = await response.json();
      setGameHistory(data.history);
    } catch (error) {
      console.error('Error loading bet history:', error);
      setGameHistory([]);
    }
  };

  const rollDice = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance');
      return;
    }

    if (amount > maxBet) {
      alert(`Maximum bet is ${maxBet} ✧`);
      return;
    }

    const newBalance = balance - amount;
    await updateBalance(newBalance);

    const result = Math.floor(Math.random() * 100) + 1;
    setRoll(result);

    let winAmount = 0;
    if (result >= target) {
      const multiplier = (100 - target) / 50 + 1;
      winAmount = Math.floor(amount * multiplier);
      const finalBalance = newBalance + winAmount;
      await updateBalance(finalBalance);
    }

    const bet = {
      amount,
      target,
      result,
      win: winAmount,
      username: user.name
    };

    // Add to database
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.name,
          action: 'bet',
          bet
        }),
      });
      
      // Update local state
      setGameHistory(prev => [bet, ...prev].slice(0, 10));
    } catch (error) {
      console.error('Error saving bet:', error);
    }

    // Handle auto bet
    if (autoBet && autoBetRuns < autoBetCount) {
      setAutoBetRuns(prev => prev + 1);
      setTimeout(() => {
        if (autoBet && autoBetRuns + 1 < autoBetCount) {
          rollDice();
        }
      }, 1000);
    }
  };

  const toggleAutoBet = () => {
    if (autoBet) {
      setAutoBet(false);
      setAutoBetCount(0);
      setAutoBetRuns(0);
    } else {
      if (!autoBetAmount || parseFloat(autoBetAmount) <= 0) {
        alert('Please set a valid auto bet amount');
        return;
      }
      if (parseFloat(autoBetAmount) > maxBet) {
        alert(`Maximum bet is ${maxBet} ✧`);
        return;
      }
      if (!autoBetTarget || autoBetTarget < 1 || autoBetTarget > 100) {
        alert('Please set a valid target (1-100)');
        return;
      }
      if (!autoBetCount || autoBetCount < 1) {
        alert('Please set a valid number of bets');
        return;
      }
      setAutoBet(true);
      setAutoBetRuns(0);
    }
  };

  const setAllIn = () => {
    const allInAmount = Math.min(balance, maxBet);
    setBetAmount(allInAmount.toFixed(2));
  };

  const getDiceFace = (value) => {
    return (
      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-black text-2xl font-bold shadow-lg animate-pop-in">
        {value}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Games
          </button>
          <div className="bg-purple-600 px-4 py-2 rounded-lg">
            Balance: {loading ? 'Loading...' : balance.toFixed(2)} ✧
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-center">Dice Game</h1>

          <div className="flex justify-center mb-8">
            <div className="bg-gray-700 rounded-lg p-8 w-48 h-48 flex items-center justify-center">
              {roll !== null ? (
                getDiceFace(roll)
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="text-4xl mb-2">🎲</div>
                  <div>Roll the dice!</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Bet Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Bet Amount (Max: {maxBet} ✧)</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setBetAmount(Math.min(value, maxBet).toString());
                    }}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="0.01"
                    max={maxBet}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Target (1-100)</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="text-sm">
                  Payout: {(100 - target) / 50 + 1}x
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={rollDice}
                    disabled={!betAmount || parseFloat(betAmount) > balance || parseFloat(betAmount) > maxBet}
                    className="bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    Roll Dice
                  </button>
                  <button
                    onClick={setAllIn}
                    disabled={balance <= 0 || balance >= maxBet}
                    className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    All In
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Auto Bet</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Bet Amount (Max: {maxBet} ✧)</label>
                  <input
                    type="number"
                    value={autoBetAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAutoBetAmount(Math.min(value, maxBet).toString());
                    }}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="0.01"
                    max={maxBet}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Target</label>
                  <input
                    type="number"
                    value={autoBetTarget}
                    onChange={(e) => setAutoBetTarget(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Number of Bets</label>
                  <input
                    type="number"
                    value={autoBetCount}
                    onChange={(e) => setAutoBetCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                  />
                </div>
                <button
                  onClick={toggleAutoBet}
                  className={`w-full ${autoBet ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} py-2 rounded-lg font-semibold transition`}
                >
                  {autoBet ? 'Stop Auto Bet' : 'Start Auto Bet'}
                </button>
                {autoBet && (
                  <div className="text-sm text-center">
                    Run {autoBetRuns} of {autoBetCount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {roll !== null && (
            <div className={`rounded-lg p-4 text-center mb-4 ${roll >= target ? 'bg-green-600' : 'bg-red-600'}`}>
              <h3 className="text-xl font-bold">
                {roll >= target ? 'You Win!' : 'You Lose!'}
              </h3>
              <p className="text-2xl">
                {roll >= target ? `+${Math.floor(parseFloat(betAmount) * ((100 - target) / 50 + 1))} ✧` : `-${betAmount} ✧`}
              </p>
            </div>
          )}

          <div className="bg-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Bet History</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No bets yet</p>
              ) : (
                gameHistory.slice().reverse().map((bet, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{bet.username}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(bet.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm mr-4">
                      Target: {bet.target}
                    </div>
                    <div className="text-sm mr-4">
                      Rolled: {bet.result}
                    </div>
                    <div className={`font-semibold ${bet.win > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bet.win > 0 ? `+${bet.win}` : `-${bet.amount}`} ✧
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
