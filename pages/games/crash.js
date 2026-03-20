import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const CrashGameService = {
  gameState: 'waiting',
  currentMultiplier: 1.00,
  lastCrashPoint: null,
  players: [],
  gameHistory: [],
  subscribers: [],
  initialized: false,
  bettingTimer: null,
  gameTimer: null,
  cooldownTimer: null,

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  },

  notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  },

  startNewGame() {
    if (this.bettingTimer) clearTimeout(this.bettingTimer);
    if (this.gameTimer) clearInterval(this.gameTimer);
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);

    this.gameState = 'betting';
    this.currentMultiplier = 1.00;
    this.notifySubscribers();

    this.bettingTimer = setTimeout(() => {
      this.startGameRound();
    }, 10000);
  },

  startGameRound() {
    this.gameState = 'running';
    this.lastCrashPoint = this.generateCrashPoint();
    this.notifySubscribers();

    const startTime = Date.now();
    const duration = 30000;

    this.gameTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      this.currentMultiplier = parseFloat((1.00 + (this.lastCrashPoint - 1.00) * progress).toFixed(2));

      // Check for auto cashout bets
      this.players.forEach(bet => {
        if (!bet.cashedOut && bet.autoCashout && this.currentMultiplier >= bet.autoCashout) {
          this.cashoutBet(bet.id, this.currentMultiplier);
        }
      });

      if (progress >= 1 || this.currentMultiplier >= this.lastCrashPoint) {
        clearInterval(this.gameTimer);
        this.currentMultiplier = this.lastCrashPoint;
        this.gameState = 'crashed';
        this.notifySubscribers();

        this.cooldownTimer = setTimeout(() => {
          this.gameState = 'waiting';
          this.gameHistory.unshift({
            id: Date.now(),
            multiplier: this.lastCrashPoint,
            timestamp: new Date().toISOString()
          });
          if (this.gameHistory.length > 10) {
            this.gameHistory.pop();
          }
          this.notifySubscribers();
          this.startNewGame();
        }, 5000);
      } else {
        this.notifySubscribers();
      }
    }, 100);
  },

  generateCrashPoint() {
    const randomValue = Math.random();
    if (randomValue < 0.5) {
      return parseFloat((1 + Math.random() * 1).toFixed(2));
    } else if (randomValue < 0.75) {
      return parseFloat((2 + Math.random() * 8).toFixed(2));
    } else if (randomValue < 0.9) {
      return parseFloat((10 + Math.random() * 40).toFixed(2));
    } else {
      return parseFloat((50 + Math.random() * 50).toFixed(2));
    }
  },

  placeBet(userId, amount, autoCashout) {
    const bet = {
      id: Date.now(),
      userId,
      amount,
      autoCashout,
      cashedOut: false,
      cashoutMultiplier: 1.00
    };
    this.players.push(bet);
    this.notifySubscribers();
    return bet;
  },

  cashoutBet(betId, currentMultiplier) {
    const betIndex = this.players.findIndex(b => b.id === betId && !b.cashedOut);
    if (betIndex !== -1) {
      this.players[betIndex].cashedOut = true;
      this.players[betIndex].cashoutMultiplier = currentMultiplier;
      this.notifySubscribers();
      return this.players[betIndex];
    }
    return null;
  }
};

export default function CrashGame() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [autoCashout, setAutoCashout] = useState(null);
  const [playerBets, setPlayerBets] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [multiplier, setMultiplier] = useState(1.00);
  const [lastCrash, setLastCrash] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const maxBet = 1000;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchBalance(userData.name);
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

  useEffect(() => {
    const unsubscribe = CrashGameService.subscribe(() => {
      setGameState(CrashGameService.gameState);
      setMultiplier(CrashGameService.currentMultiplier);
      setPlayers([...CrashGameService.players]);
    });

    if (!CrashGameService.initialized) {
      CrashGameService.initialized = true;
      CrashGameService.startNewGame();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (CrashGameService.lastCrashPoint !== lastCrash) {
      setLastCrash(CrashGameService.lastCrashPoint);
    }
    if (JSON.stringify(CrashGameService.gameHistory) !== JSON.stringify(gameHistory)) {
      setGameHistory([...CrashGameService.gameHistory]);
    }
  });

  const placeBet = async () => {
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

    const bet = CrashGameService.placeBet('current-user', amount, autoCashout);
    setPlayerBets([...playerBets, bet]);
    setBetAmount('');
    setAutoCashout(null);
  };

  const setAllIn = () => {
    const allInAmount = Math.min(balance, maxBet);
    setBetAmount(allInAmount.toFixed(2));
  };

  const cashout = async (betId) => {
    const bet = CrashGameService.players.find(b => b.id === betId && !b.cashedOut);
    if (bet) {
      const cashedOutBet = CrashGameService.cashoutBet(betId, multiplier);
      if (cashedOutBet) {
        const winAmount = bet.amount * multiplier;
        const newBalance = balance + winAmount;
        await updateBalance(newBalance);
      }
    }
  };

  const cashoutAll = async () => {
    for (const bet of playerBets) {
      if (!bet.cashedOut) {
        await cashout(bet.id);
      }
    }
  };

  // Check if all bets are cashed out
  const allBetsCashedOut = playerBets.length > 0 && playerBets.every(bet => bet.cashedOut);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-3xl font-bold mb-4">Crash Game</h1>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold mb-2" style={{ color: gameState === 'crashed' ? '#ef4444' : '#10b981' }}>
              {multiplier.toFixed(2)}x
            </div>
            <div className="text-lg">
              {gameState === 'betting' && 'Place your bets!'}
              {gameState === 'running' && 'Game in progress...'}
              {gameState === 'crashed' && 'Game crashed!'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Place Bet</h2>
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
                    min="0"
                    max={maxBet}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Auto Cashout (optional)</label>
                  <input
                    type="number"
                    value={autoCashout || ''}
                    onChange={(e) => setAutoCashout(parseFloat(e.target.value) || null)}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1.00"
                    step="0.01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={placeBet}
                    disabled={gameState !== 'betting' || parseFloat(betAmount) > maxBet}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    Place Bet
                  </button>
                  <button
                    onClick={setAllIn}
                    disabled={gameState !== 'betting' || balance <= 0 || balance >= maxBet}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    All In
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Your Bets</h2>
              {playerBets.length === 0 ? (
                <p className="text-gray-400">No active bets</p>
              ) : (
                <div className="space-y-3">
                  {playerBets.map((bet) => (
                    <div key={bet.id} className="flex justify-between items-center bg-gray-600 rounded p-2">
                      <div>
                        <div className="font-semibold">{bet.amount} ✧</div>
                        {bet.autoCashout && (
                          <div className="text-sm text-gray-400">Auto cashout at {bet.autoCashout}x</div>
                        )}
                      </div>
                      <button
                        onClick={() => cashout(bet.id)}
                        disabled={bet.cashedOut || gameState === 'crashed'}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition disabled:opacity-50"
                      >
                        {bet.cashedOut ? 'Cashed Out' : 'Cash Out'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!allBetsCashedOut && playerBets.length > 0 && (
                <button
                  onClick={cashoutAll}
                  disabled={gameState === 'crashed'}
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold mt-4 transition disabled:opacity-50"
                >
                  Cash Out All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Game History</h2>
            <div className="space-y-2">
              {gameHistory.map((game) => (
                <div key={game.id} className="flex justify-between bg-gray-700 rounded p-2">
                  <span>{new Date(game.timestamp).toLocaleTimeString()}</span>
                  <span className={game.multiplier < 2 ? 'text-red-400' : 'text-green-400'}>
                    {game.multiplier.toFixed(2)}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Active Players</h2>
            <div className="space-y-2">
              {players.length === 0 ? (
                <p className="text-gray-400">No active players</p>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="flex justify-between bg-gray-700 rounded p-2">
                    <span>Player {player.userId}</span>
                    <span>{player.amount} ✧</span>
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
