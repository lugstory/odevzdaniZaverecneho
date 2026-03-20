import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValues = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

export default function BlackjackGame() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState('betting'); // betting, playing, dealer-turn, game-over
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [message, setMessage] = useState('');
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canSplit, setCanSplit] = useState(false);
  const [canDouble, setCanDouble] = useState(false);
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
      fetchBalance(user.name);
    }
  };

  const createDeck = () => {
    const newDeck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        newDeck.push({ suit, rank, value: rankValues[rank] });
      }
    }
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;
    
    for (const card of hand) {
      if (card.rank === 'A') {
        aces++;
      }
      score += card.value;
    }
    
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    
    return score;
  };

  const dealInitialCards = async () => {
    // Deduct bet amount from balance
    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }
    
    const newBalance = balance - betAmount;
    await updateBalance(newBalance);

    const newDeck = createDeck();
    const newPlayerHand = [newDeck.pop(), newDeck.pop()];
    const newDealerHand = [newDeck.pop(), newDeck.pop()];
    
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    
    const playerScore = calculateScore(newPlayerHand);
    const dealerScore = calculateScore([newDealerHand[0]]);
    
    setPlayerScore(playerScore);
    setDealerScore(dealerScore);
    
    setGameState('playing');
    setMessage('Your turn');
    
    // Check if cards have the same value (not just same rank) for splitting
    setCanSplit(newPlayerHand[0].value === newPlayerHand[1].value);
    setCanDouble(true);
    
    if (playerScore === 21) {
      setTimeout(() => {
        stand();
      }, 1000);
    }
  };

  const hit = () => {
    if (gameState !== 'playing') return;
    
    const newDeck = [...deck];
    const newCard = newDeck.pop();
    const newPlayerHand = [...playerHand, newCard];
    
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    
    const newScore = calculateScore(newPlayerHand);
    setPlayerScore(newScore);
    
    if (newScore > 21) {
      endGame('bust');
    } else if (newScore === 21) {
      stand();
    }
    
    setCanDouble(false);
  };

  const stand = () => {
    if (gameState !== 'playing') return;
    
    setGameState('dealer-turn');
    setMessage('Dealer\'s turn');
    
    const newDeck = [...deck];
    let newDealerHand = [...dealerHand];
    
    while (calculateScore(newDealerHand) < 17) {
      newDealerHand.push(newDeck.pop());
    }
    
    setDeck(newDeck);
    setDealerHand(newDealerHand);
    
    const finalDealerScore = calculateScore(newDealerHand);
    const finalPlayerScore = calculateScore(playerHand);
    
    setDealerScore(finalDealerScore);
    
    setTimeout(() => {
      determineWinner(finalPlayerScore, finalDealerScore);
    }, 1000);
  };

  const double = async () => {
    if (gameState !== 'playing' || !canDouble || balance < betAmount) return;
    
    // Deduct the doubled bet amount from balance
    const doubledBet = betAmount * 2;
    const newBalance = balance - doubledBet;
    await updateBalance(newBalance);
    
    const newDeck = [...deck];
    const newCard = newDeck.pop();
    const newPlayerHand = [...playerHand, newCard];
    
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    
    const newScore = calculateScore(newPlayerHand);
    setPlayerScore(newScore);
    
    // Update bet amount to reflect the doubled bet
    setBetAmount(doubledBet);
    setCanDouble(false);
    
    if (newScore > 21) {
      endGame('bust');
    } else {
      stand();
    }
  };

  const split = () => {
    if (gameState !== 'playing' || !canSplit || balance < betAmount) return;
    
    const newBalance = balance - betAmount;
    updateBalance(newBalance);
    
    const newDeck = [...deck];
    const newPlayerHand = [playerHand[0], newDeck.pop()];
    const newSecondHand = [playerHand[1], newDeck.pop()];
    
    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    
    const newScore = calculateScore(newPlayerHand);
    setPlayerScore(newScore);
    
    setBetAmount(betAmount * 2);
    setCanSplit(false);
    setCanDouble(true);
    
    if (newScore === 21) {
      setTimeout(() => {
        stand();
      }, 1000);
    }
  };

  const determineWinner = (playerScore, dealerScore) => {
    if (dealerScore > 21) {
      endGame('win', 'Dealer busts! You win!');
    } else if (playerScore > dealerScore) {
      endGame('win', 'You win!');
    } else if (playerScore < dealerScore) {
      endGame('lose', 'Dealer wins!');
    } else {
      endGame('push', 'Push! It\'s a tie!');
    }
  };

  const endGame = (result, customMessage = '') => {
    setGameState('game-over');
    
    let winAmount = 0;
    let finalMessage = customMessage;
    
    switch (result) {
      case 'win':
        winAmount = betAmount * 2;
        finalMessage = customMessage || 'You win!';
        break;
      case 'blackjack':
        winAmount = Math.floor(betAmount * 2.5);
        finalMessage = customMessage || 'Blackjack! You win!';
        break;
      case 'push':
        winAmount = betAmount;
        finalMessage = customMessage || 'Push! It\'s a tie!';
        break;
      case 'bust':
        winAmount = 0;
        finalMessage = customMessage || 'Bust! You lose!';
        break;
      case 'lose':
        winAmount = 0;
        finalMessage = customMessage || 'Dealer wins!';
        break;
    }
    
    const newBalance = balance + winAmount;
    updateBalance(newBalance);
    
    setMessage(finalMessage);
    
    const gameResult = {
      bet: betAmount,
      win: winAmount,
      playerHand: [...playerHand],
      dealerHand: [...dealerHand],
      result,
      timestamp: new Date()
    };
    
    setGameHistory(prev => [gameResult, ...prev].slice(0, 10));
  };

  const newGame = () => {
    setBetAmount(Math.min(10, balance));
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setMessage('');
    setGameState('betting');
    setCanSplit(false);
    setCanDouble(false);
  };

  const setAllIn = () => {
    const allInAmount = Math.min(balance, maxBet);
    setBetAmount(allInAmount);
  };

  const renderCard = (card, hidden = false) => {
    if (hidden) {
      return (
        <div className="w-16 h-24 bg-blue-600 rounded-lg flex items-center justify-center border-2 border-white">
          <div className="text-white text-2xl">?</div>
        </div>
      );
    }
    
    return (
      <div className="w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-gray-300">
        <div className="text-lg font-bold text-black">{card.rank}</div>
        <div className="text-xl text-black">{card.suit}</div>
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
          <h1 className="text-3xl font-bold mb-6 text-center">Blackjack</h1>

          <div className="mb-8">
            <div className="text-center mb-4">
              <div className="text-xl font-semibold mb-2">Dealer</div>
              <div className="text-lg">Score: {gameState === 'playing' ? '?' : dealerScore}</div>
              <div className="flex justify-center space-x-2 mt-2">
                {dealerHand.map((card, index) => (
                  <div key={index}>
                    {renderCard(card, index === 1 && gameState === 'playing')}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-xl font-semibold mb-2">Player</div>
              <div className="text-lg">Score: {playerScore}</div>
              <div className="flex justify-center space-x-2 mt-2">
                {playerHand.map((card, index) => (
                  <div key={index}>
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            </div>

            <div className={`text-center text-lg font-semibold mb-4 ${
              message.includes('win') ? 'text-green-400' : 
              message.includes('lose') || message.includes('bust') ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {message}
            </div>
          </div>

          {gameState === 'betting' && (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold mb-4">Place Your Bet</h2>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={dealInitialCards}
                    disabled={betAmount > balance || betAmount <= 0}
                    className="bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    Deal Cards
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={hit}
                className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition"
              >
                Hit
              </button>
              <button
                onClick={stand}
                className="bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition"
              >
                Stand
              </button>
              <button
                onClick={double}
                disabled={!canDouble || balance < betAmount}
                className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Double
              </button>
              <button
                onClick={split}
                disabled={!canSplit || balance < betAmount}
                className="bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Split
              </button>
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
                        Bet: {game.bet} ✧
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      game.result === 'win' || game.result === 'blackjack' ? 'text-green-400' :
                      game.result === 'push' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {game.result === 'win' ? `+${game.win - game.bet}` :
                       game.result === 'blackjack' ? `+${game.win - game.bet}` :
                       game.result === 'push' ? '0' : `-${game.bet}`} ✧
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
