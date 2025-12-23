"use client";

import { useParams } from "next/navigation";

export default function DownloadPage() {
  const params = useParams();
  const token = params.token as string;

  function handleDownload() {
    window.location.href = `/api/v1/productions/${token}/download`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-md text-center space-y-6">
        <div className="text-6xl">📸</div>
        <h1 className="text-2xl font-bold text-white">Your Photos Are Ready!</h1>
        <p className="text-white/70">Click the button below to download your photos.</p>
        <button
          onClick={handleDownload}
          className="w-full bg-white text-purple-900 font-bold py-4 rounded-lg text-xl hover:bg-white/90 transition"
        >
          Download Photos
        </button>
        <p className="text-white/50 text-sm">This download link expires in 7 days.</p>
      </div>
    </div>
  );
}
