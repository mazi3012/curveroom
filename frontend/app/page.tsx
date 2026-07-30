"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Video, 
  ShieldCheck, 
  Eye, 
  Layers, 
  Plus, 
  ArrowRight, 
  QrCode, 
  Sparkles, 
  Zap, 
  Monitor, 
  Smartphone,
  CheckCircle2
} from "lucide-react";
import { roomApi } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [joinSlug, setJoinSlug] = useState("");
  const [createName, setCreateName] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const res = await roomApi.list();
      setActiveRooms(res.data || []);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await roomApi.create({
        name: createName,
        duration_hours: Number(durationHours) || 2,
      });
      setShowCreateModal(false);
      setCreateName("");
      router.push(`/room/${res.data.slug}`);
    } catch (err) {
      alert("Failed to create room. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinSlug.trim()) return;
    const cleanSlug = joinSlug.trim().split("/").pop();
    router.push(`/room/${cleanSlug}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/20 via-cyan-500/10 to-transparent blur-[140px] pointer-events-none -z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[140px] pointer-events-none -z-0" />

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl shadow-lg shadow-blue-500/25">
              <Video className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Curve Room
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/interviewer/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all"
            >
              Interviewer Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
            >
              Sign In
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            Spatial Proctoring & Edge Vision
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Spatial Technical Interview Platform
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-normal leading-relaxed">
            Eliminate remote cheating with dual-camera spatial streaming and client-side MediaPipe computer vision. Real-time behavioral telemetry without invasive oversight.
          </p>

          {/* Quick Action Forms */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {/* Quick Join */}
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Room Code or Slug..."
                  value={joinSlug}
                  onChange={(e) => setJoinSlug(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all flex items-center gap-1"
                >
                  Join
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:opacity-95 transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-5 h-5" />
              Create Interview Room
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dual Stream Spatial View</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Synchronized multi-angle streaming using primary webcam for candidate face & secondary mobile camera for workstation environment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Edge MediaPipe CV</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Client-side AI models track head gaze, hand movement, and presence without uploading raw video streams to third party servers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Real-Time Trust Scoring</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automated behavioral scoring engine streams instant telemetry to interviewers via WebSockets with detailed event breakdowns.
            </p>
          </div>
        </div>

        {/* Active Rooms Quick Access Section */}
        {activeRooms.length > 0 && (
          <div className="mt-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Active Test Rooms ({activeRooms.length})
              </h3>
              <button 
                onClick={fetchActiveRooms}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-blue-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-white truncate">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">Slug: {room.slug}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                    <Link
                      href={`/room/${room.slug}`}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition-all"
                    >
                      Join Room →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1">Create Interview Room</h3>
            <p className="text-sm text-slate-400 mb-6">
              Set up a secure room slug and generate access tokens.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Interview Title / Candidate Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Assessment - Alex"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Session Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create & Launch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        Curve Room &copy; {new Date().getFullYear()} — Spatial Technical Interview Platform
      </footer>
    </div>
  );
}