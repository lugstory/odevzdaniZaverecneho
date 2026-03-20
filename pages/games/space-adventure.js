import { useRouter } from 'next/router';

export default function SpaceAdventure() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.back()}
        className="mb-4 text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Games
      </button>

      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-blue-400 mb-6">SPACE ADVENTURE</h1>
        <div className="bg-gray-800 rounded-lg p-8">
          <p className="text-gray-300 mb-4">This game is coming soon!</p>
          <p className="text-gray-400">Try our other games in the meantime.</p>
        </div>
      </div>
    </div>
  );
}
