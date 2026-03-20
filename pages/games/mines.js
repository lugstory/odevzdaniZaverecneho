import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MinesGame() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [gameState, setGameState] = useState('betting'); // betting, playing, game-over
  const [grid, setGrid] = useState([]);
  const [revealedCells, setRevealedCells] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalWin, setTotalWin] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const router = useRouter();

  const maxBet = 1000;
  const gridSize = 5;

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
      fetchBalance(user.name);
    }
  };

  const createGrid = () => {
    const totalCells = gridSize * gridSize;
    const cells = Array(totalCells).fill(null).map((_, index) => ({
      id: index,
      isMine: false,
      isRevealed: false,
      isGem: true
    }));

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const randomIndex = Math.floor(Math.random() * totalCells);
      if (!cells[randomIndex].isMine) {
        cells[randomIndex].isMine = true;
        cells[randomIndex].isGem = false;
        minesPlaced++;
      }
    }

    return cells;
  };

  const startGame = async () => {
    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    if (betAmount > maxBet) {
      alert(`Maximum bet is ${maxBet} ✧`);
      return;
    }

    // Deduct bet amount
    const newBalance = balance - betAmount;
    await updateBalance(newBalance);

    // Create new game
    const newGrid = createGrid();
    setGrid(newGrid);
    setRevealedCells([]);
    setGameState('playing');
    setTotalWin(0);
    setCurrentMultiplier(1);
  };

  const revealCell = async (cellIndex) => {
    if (gameState !== 'playing' || revealedCells.includes(cellIndex)) {
      return;
    }

    const newRevealedCells = [...revealedCells, cellIndex];
    setRevealedCells(newRevealedCells);

    const cell = grid[cellIndex];
    
    if (cell.isMine) {
      // Hit a mine - game over, reveal all cells
      setGameState('game-over');
      revealAllCells();
      const gameResult = {
        bet: betAmount,
        win: 0,
        mines: mineCount,
        result: 'lose',
        timestamp: new Date()
      };
      setGameHistory(prev => [gameResult, ...prev].slice(0, 10));
      return;
    }

    // Hit a gem - calculate win with worse RTP
    const safeCells = gridSize * gridSize - mineCount;
    const revealedSafeCells = newRevealedCells.filter(index => !grid[index].isMine).length;
    
    // Worse RTP calculation - lower multiplier
    const baseMultiplier = 1.0;
    const minePenalty = mineCount / gridSize; // Penalty for more mines
    const revealedBonus = revealedSafeCells / safeCells; // Bonus for revealing safe cells
    
    // Calculate multiplier with worse RTP
    const multiplier = baseMultiplier + (revealedBonus * 2) - (minePenalty * 0.5);
    const finalMultiplier = Math.max(0.5, multiplier); // Ensure multiplier doesn't go below 0.5
    
    const winAmount = betAmount * finalMultiplier;
    setTotalWin(winAmount);
    setCurrentMultiplier(finalMultiplier);

    // Check if all safe cells are revealed
    if (revealedSafeCells === safeCells) {
      setGameState('game-over');
      revealAllCells();
      const finalBalance = balance + winAmount;
      await updateBalance(finalBalance);
      
      const gameResult = {
        bet: betAmount,
        win: winAmount,
        mines: mineCount,
        result: 'win',
        timestamp: new Date()
      };
      setGameHistory(prev => [gameResult, ...prev].slice(0, 10));
    }
  };

  const revealAllCells = () => {
    const allRevealed = grid.map((_, index) => index);
    setRevealedCells(allRevealed);
  };

  const cashout = async () => {
    if (gameState !== 'playing' || totalWin === 0) return;

    const finalBalance = balance + totalWin;
    await updateBalance(finalBalance);
    
    setGameState('game-over');
    revealAllCells();
    
    const gameResult = {
      bet: betAmount,
      win: totalWin,
      mines: mineCount,
      result: 'cashout',
      timestamp: new Date()
    };
    setGameHistory(prev => [gameResult, ...prev].slice(0, 10));
  };

  const newGame = () => {
    setGrid([]);
    setRevealedCells([]);
    setGameState('betting');
    setTotalWin(0);
    setCurrentMultiplier(1);
  };

  const setAllIn = () => {
    const allInAmount = Math.min(balance, maxBet);
    setBetAmount(allInAmount);
  };

  const renderCell = (cell, index) => {
    const isRevealed = revealedCells.includes(index) || gameState === 'game-over';
    
    if (isRevealed) {
      if (cell.isMine) {
        return (
          <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center border-2 border-red-400">
            <div className="text-2xl">💣</div>
          </div>
        );
      } else {
        return (
          <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center border-2 border-green-400">
            <div className="text-2xl">💎</div>
          </div>
        );
      }
    } else {
      return (
        <div 
          className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 hover:bg-gray-600 cursor-pointer transition-colors"
          onClick={() => revealCell(index)}
        >
          <div className="text-gray-400 text-2xl">?</div>
        </div>
      );
    }
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
          <h1 className="text-3xl font-bold mb-6 text-center">Mines</h1>

          {gameState === 'betting' && (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Bet Amount (Max: {maxBet} ✧)</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setBetAmount(Math.min(value, maxBet, balance));
                    }}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                    max={maxBet}
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Number of Mines (1-24)</label>
                  <input
                    type="number"
                    value={mineCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setMineCount(Math.min(24, Math.max(1, value)));
                    }}
                    className="w-full bg-gray-600 rounded px-3 py-2 text-white"
                    min="1"
                    max="24"
                  />
                </div>
                <div className="text-sm">
                  Safe cells: {gridSize * gridSize - mineCount} | 
                  Starting multiplier: 1.00x
                </div>
                <div className="text-sm text-yellow-400">
                  Warning: Higher mine count = Lower RTP
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startGame}
                    disabled={betAmount > balance || betAmount <= 0}
                    className="bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={setAllIn}
                    disabled={balance <= 0}
                    className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    All In
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg">
                  Current Win: {totalWin.toFixed(2)} ✧ ({currentMultiplier.toFixed(2)}x)
                </div>
                <button
                  onClick={cashout}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Cash Out
                </button>
              </div>
            </div>
          )}

          {gameState === 'game-over' && (
            <div className={`rounded-lg p-4 text-center mb-6 ${
              totalWin > 0 ? 'bg-green-600' : 'bg-red-600'
            }`}>
              <h3 className="text-xl font-bold mb-2">
                {totalWin > 0 ? 'You Win!' : 'Game Over!'}
              </h3>
              <p className="text-2xl">
                {totalWin > 0 ? `+${totalWin.toFixed(2)} ✧` : `-${betAmount} ✧`}
              </p>
              <p className="text-sm mt-2 opacity-75">
                All mines revealed
              </p>
            </div>
          )}

          {grid.length > 0 && (
            <div className="flex justify-center mb-6">
              <div className="grid grid-cols-5 gap-2">
                {grid.map((cell, index) => (
                  <div key={index}>
                    {renderCell(cell, index)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState === 'game-over' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={newGame}
                className="bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition"
              >
                New Game
              </button>
            </div>
          )}

          <div className="bg-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Game History</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No games yet</p>
              ) : (
                gameHistory.slice().reverse().map((game, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-2">
                    <div className="text-sm">
                      <div>{new Date(game.timestamp).toLocaleTimeString()}</div>
                      <div className="text-xs text-gray-400">
                        Mines: {game.mines} | Bet: {game.bet} ✧
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      game.result === 'win' || game.result === 'cashout' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {game.result === 'win' || game.result === 'cashout' ? `+${game.win}` : `-${game.bet}`} ✧
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
