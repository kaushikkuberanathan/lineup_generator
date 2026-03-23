"use client";

import { useState } from "react";

export default function Home() {
  const [players, setPlayers] = useState("");
  const [lineup, setLineup] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const generateLineup = async () => {
    if (!players.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/generate-lineup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          players: players.split(",").map(p => p.trim()).filter(Boolean)
        })
      });

      const data = await res.json();
      setLineup(data.lineup || []);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6">
        Lineup Generator ⚾
      </h1>

      <textarea
        placeholder="Enter players separated by commas"
        className="border p-3 w-full max-w-md mb-4 rounded"
        rows={4}
        value={players}
        onChange={(e) => setPlayers(e.target.value)}
      />

      <button
        onClick={generateLineup}
        className="bg-blue-600 text-white px-6 py-2 rounded mb-6"
      >
        {loading ? "Generating..." : "Generate Lineup"}
      </button>

      <ul className="text-lg">
        {lineup.map((player, index) => (
          <li key={index}>
            {index + 1}. {player}
          </li>
        ))}
      </ul>
    </div>
  );
}
