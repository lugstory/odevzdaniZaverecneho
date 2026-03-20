import Link from 'next/link';

export default function GameCard({ game, small = false }) {
  return (
    <Link
      href={`/games/${game.name.toLowerCase().replace(/\s+/g, '-')}`}
      className={`block ${small ? 'transform hover:scale-105' : 'transform hover:scale-105 hover:rotate-1'} transition-all duration-300`}
    >
      <div className={`bg-gray-800/50 rounded-lg overflow-hidden border border-white/10 ${small ? 'h-32' : 'h-48'}`}>
        <div className={`relative h-3/4 bg-gradient-to-br from-purple-900 to-pink-900 p-2`}>
          <img
            src={game.thumbnail}
            alt={game.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.target.src = '/images/placeholder.png'; // Fallback image
            }}
          />
        </div>
        <div className={`p-3 ${small ? 'text-xs' : 'text-sm'}`}>
          <h3 className="font-bold truncate">{game.name}</h3>
          {game.category && (
            <p className="text-purple-400 text-xs truncate">{game.category}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
