import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '🔔', '💰', '🎰'];
const symbolValues = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 4,
  '🍇': 5,
  '💎': 10,
  '🔔': 15,
  '💰': 20,
  '🎰': 50
};

export default function SlotsGame() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [betAmount, setBetAmount] = useState(1);
  const [denomination, setDenomination] = useState(1);
  const [reels, setReels] = useState([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  const [spinning, setSpinning] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [winLines, setWinLines] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [autoSpin, setAutoSpin] = useState(false);
  const [loading, setLoading] = useState(true);
  const spinInterval = useRef(null);
  const router = useRouter();

  const totalBet = betAmount * denomination;
  const maxBetPerLine = 100;
  const maxTotalBet = 500;

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

  const spinReels = async () => {
    if (spinning || totalBet > balance || totalBet > maxTotalBet) return;

    const newBalance = balance - totalBet;
    await updateBalance(newBalance);

    setSpinning(true);
    setWinAmount(0);
    setWinLines([]);

    const spinDuration = 3000;
    const steps = 30;
    const stepDuration = spinDuration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const newReels = [
        [Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length)],
        [Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length)],
        [Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length), Math.floor(Math.random() * symbols.length)]
      ];
      setReels(newReels);

      if (currentStep >= steps) {
        clearInterval(interval);
        setSpinning(false);
        checkWin(newReels);
        setGameHistory(prev => [...prev, { bet: totalBet, win: winAmount, reels: newReels, timestamp: new Date() }].slice(-10));
      }
    }, stepDuration);
  };

  const setAllIn = () => {
    const maxBet = Math.min(
      Math.floor(balance / denomination),
      maxBetPerLine,
      Math.floor(maxTotalBet / denomination)
    );
    setBetAmount(maxBet > 0 ? maxBet : 1);
  };

  const checkWin = (resultReels) => {
    const lines = [
      [resultReels[0][0], resultReels[1][0], resultReels[2][0]],
      [resultReels[0][1], resultReels[1][1], resultReels[2][1]],
      [resultReels[0][2], resultReels[1][2], resultReels[2][2]],
      [resultReels[0][0], resultReels[1][1], resultReels[2][2]],
      [resultReels[0][2], resultReels[1][1], resultReels[2][0]]
    ];

    let totalWin = 0;
    const winningLines = [];

    lines.forEach((line, lineIndex) => {
      if (line[0] === line[1] && line[1] === line[2]) {
        const symbol = symbols[line[0]];
        const multiplier = symbolValues[symbol];
        const lineWin = betAmount * denomination * multiplier;
        totalWin += lineWin;
        winningLines.push(lineIndex);
      }
    });

    setWinAmount(totalWin);
    setWinLines(winningLines);

    if (totalWin > 0) {
      const newBalance = balance + totalWin;
      updateBalance(newBalance);
    }
  };

  const toggleAutoSpin = () => {
    if (autoSpin) {
      clearInterval(spinInterval.current);
      setAutoSpin(false);
    } else {
      setAutoSpin(true);
      spinInterval.current = setInterval(async () => {
        if (!spinning) {
          // Re-fetch balance before each spin to ensure accuracy
          await fetchBalance(user.name);
          if (totalBet <= balance && totalBet <= maxTotalBet) {
            spinReels();
          } else {
            clearInterval(spinInterval.current);
            setAutoSpin(false);
          }
        }
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (spinInterval.current) {
        clearInterval(spinInterval.current);
      }
    };
  }, []);

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
          <h1 className="text-3xl font-bold mb-6 text-center">Slots Game</h1>

          <div className="flex justify-center mb-6">
            <div className="flex space-x-4">
              {reels.map((reel, reelIndex) => (
                <div key={reelIndex} className="bg-gray-700 rounded-lg p-4 w-20 h-32 flex flex-col justify-center items-center">
                  <div className={`text-4xl mb-2 ${spinning ? 'animate-bounce' : ''}`}>
                    {symbols[reel[0]]}
                  </div>
                  <div className={`text-4xl mb-2 ${spinning ? 'animate-bounce' : ''}`}>
                    {symbols[reel[1]]}
                  </div>
                  <div className={`text-4xl ${spinning ? 'animate-bounce' : ''}`}>
                    {symbols[reel[2]]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Bet Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Bet per Line (Max: {maxBetPerLine})</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      setBetAmount(Math.min(value, maxBetPerLine));
                    }}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                    max={maxBetPerLine}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Denomination</label>
                  <select
                    value={denomination}
                    onChange={(e) => setDenomination(parseInt(e.target.value))}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="1">1 ✧</option>
                    <option value="5">5 ✧</option>
                    <option value="10">10 ✧</option>
                    <option value="25">25 ✧</option>
                  </select>
                </div>
                <div className="text-sm">
                  Total Bet: {totalBet} ✧ (Max: {maxTotalBet} ✧)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={spinReels}
                    disabled={spinning || totalBet > balance || totalBet > maxTotalBet}
                    className="bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {spinning ? 'Spinning...' : 'Spin'}
                  </button>
                  <button
                    onClick={setAllIn}
                    disabled={balance <= denomination || spinning || totalBet >= maxTotalBet}
                    className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    All In
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 flex flex-col justify-center">
              <button
                onClick={toggleAutoSpin}
                className={`w-full ${autoSpin ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} py-2 rounded-lg font-semibold transition`}
              >
                {autoSpin ? 'Stop Auto Spin' : 'Auto Spin'}
              </button>
            </div>
          </div>

          {winAmount > 0 && (
            <div className="bg-green-600 rounded-lg p-4 text-center mb-4">
              <h3 className="text-xl font-bold">You Win!</h3>
              <p className="text-2xl">{winAmount} ✧</p>
            </div>
          )}

          <div className="bg-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Game History</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameHistory.slice().reverse().map((game, index) => (
                <div key={index} className="flex justify-between bg-gray-600 rounded p-2">
                  <span>{new Date(game.timestamp).toLocaleTimeString()}</span>
                  <span className={game.win > 0 ? 'text-green-400' : 'text-red-400'}>
                    {game.win > 0 ? `+${game.win}` : `-${game.bet}`} ✧
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
