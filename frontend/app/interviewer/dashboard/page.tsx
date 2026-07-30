"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { roomApi, telemetryApi } from "@/lib/api";
import { useAuthStore } from "@/lib/hooks";
import { 
  ShieldCheck, 
  Video, 
  Activity, 
  Plus, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  QrCode, 
  Users, 
  ExternalLink,
  RefreshCw,
  Zap,
  LogOut
} from "lucide-react";

interface Room {
  id: string;
  slug: string;
  name: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Event {
  id: string;
  room_id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  severity: string;
  created_at: string;
}

interface TrustScore {
  trust_score: number;
  event_count: number;
  severity_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

export default function InterviewerDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Auth protection - redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchRooms();
  }, [router]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await roomApi.list();
      const roomsData = response.data || [];
      setRooms(roomsData);
      if (roomsData.length > 0 && !selectedRoom) {
        handleRoomSelect(roomsData[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch rooms:", err);
      setRooms([]); // Ensure rooms is set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = async (room: Room) => {
    setSelectedRoom(room);

    // Close existing websocket if any
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      // Fetch full details (includes QR code)
      const detailsRes = await roomApi.get(room.slug);
      setRoomDetails(detailsRes.data);

      // Fetch events
      const eventsResponse = await telemetryApi.getEvents(room.id);
      setEvents(eventsResponse.data || []);

      // Fetch trust score
      const trustResponse = await telemetryApi.getTrustScore(room.id);
      // Add defensive programming for trust score data
      const trustData = trustResponse.data || {
        trust_score: 100,
        event_count: 0,
        severity_breakdown: { high: 0, medium: 0, low: 0 }
      };
      // Ensure severity_breakdown exists and has all required fields
      if (!trustData.severity_breakdown) {
        trustData.severity_breakdown = { high: 0, medium: 0, low: 0 };
      } else {
        trustData.severity_breakdown = {
          high: trustData.severity_breakdown.high || 0,
          medium: trustData.severity_breakdown.medium || 0,
          low: trustData.severity_breakdown.low || 0
        };
      }
      setTrustScore(trustData);

      // Connect to WebSocket for real-time telemetry
      const wsUrl = `ws://localhost:8000/api/v1/telemetry/ws/${room.slug}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
        socket.send(JSON.stringify({ type: "subscribe" }));
      };

      socket.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === "event_update" && payload.data) {
            setEvents((prev) => [payload.data, ...prev]);
            // Recalculate trust score locally
            setTrustScore((prev) => {
              if (!prev) return null;
              const sev = payload.data.severity || "low";
              const newBreakdown = {
                ...prev.severity_breakdown,
                [sev]: (prev.severity_breakdown[sev as keyof typeof prev.severity_breakdown] || 0) + 1,
              };
              const penalty = (newBreakdown.high * 20) + (newBreakdown.medium * 10) + (newBreakdown.low * 5);
              return {
                trust_score: Math.max(0, 100 - penalty),
                event_count: prev.event_count + 1,
                severity_breakdown: newBreakdown,
              };
            });
          } else if (payload.type === "trust_score_update" && payload.data) {
            setTrustScore(payload.data);
          }
        } catch (e) {
          console.error("WS message decode error", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socketRef.current = socket;
    } catch (err: any) {
      console.error("Failed to fetch room details:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const res = await roomApi.create({ name: newRoomName, duration_hours: 2 });
      setShowCreateModal(false);
      setNewRoomName("");
      await fetchRooms();
      handleRoomSelect(res.data);
    } catch (err) {
      alert("Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 50) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  // Add defensive check for trustScore in the render
  const safeTrustScore = trustScore || {
    trust_score: 100,
    event_count: 0,
    severity_breakdown: { high: 0, medium: 0, low: 0 }
  };

  // Ensure safeTrustScore has proper structure
  if (!safeTrustScore.severity_breakdown) {
    safeTrustScore.severity_breakdown = { high: 0, medium: 0, low: 0 };
  } else {
    safeTrustScore.severity_breakdown = {
      high: safeTrustScore.severity_breakdown.high || 0,
      medium: safeTrustScore.severity_breakdown.medium || 0,
      low: safeTrustScore.severity_breakdown.low || 0
    };
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-lg text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Interviewer Proctoring Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="w-6 h-6 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-xs text-slate-300">{user?.full_name || "User"}</span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                {user?.role || "interviewer"}
              </span>
            </div>

            <button
              onClick={fetchRooms}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("access_token");
                logout();
                router.push("/login");
              }}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              New Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room List Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  Active Sessions ({rooms.length})
                </h2>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {rooms.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    No interview rooms created yet.
                  </div>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedRoom?.id === room.id
                          ? "bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/5"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-white truncate pr-2">
                          {room.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {room.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Slug: {room.slug}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Selected Room Details Column */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRoom ? (
              <>
                {/* Header Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      {selectedRoom.name}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Room Slug: {selectedRoom.slug} | ID: {selectedRoom.id.slice(0, 8)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${wsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                      <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {wsConnected ? "WebSocket Live" : "Connecting Live"}
                    </span>

                    <Link
                      href={`/room/${selectedRoom.slug}`}
                      target="_blank"
                      className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold rounded-xl border border-blue-500/30 transition-all flex items-center gap-1"
                    >
                      Open Candidate Room
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Trust Score & QR Code Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Trust Score Display */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Candidate Real-Time Trust Score
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className={`p-4 rounded-2xl border text-center ${getTrustScoreColor(safeTrustScore.trust_score)}`}>
                        <div className="text-5xl font-black tracking-tight">
                          {safeTrustScore.trust_score.toFixed(0)}
                        </div>
                        <div className="text-[11px] font-semibold opacity-80 mt-1">/ 100 PTS</div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High Severity
                          </span>
                          <span className="font-mono font-bold text-red-400">{safeTrustScore.severity_breakdown.high}</span>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium Severity
                          </span>
                          <span className="font-mono font-bold text-amber-400">{safeTrustScore.severity_breakdown.medium}</span>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Low Severity
                          </span>
                          <span className="font-mono font-bold text-blue-400">{safeTrustScore.severity_breakdown.low}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Pairing Code */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      Mobile Secondary Stream QR Code
                    </h3>

                    {roomDetails?.qr_code ? (
                      <div className="flex items-center gap-4">
                        <img
                          src={`data:image/png;base64,${roomDetails.qr_code}`}
                          alt="Room QR Code"
                          className="w-24 h-24 rounded-lg bg-white p-1 shadow-md"
                        />
                        <div className="text-xs text-slate-400 space-y-1">
                          <p className="font-semibold text-slate-200">Mobile Pairing Link</p>
                          <p className="leading-relaxed text-[11px]">
                            Scan with candidate mobile camera to establish secondary workstation view.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">QR code generating...</p>
                    )}
                  </div>
                </div>

                {/* Telemetry Event Stream */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Live Edge Behavioral Telemetry Stream ({events.length})
                  </h3>

                  {events.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      No telemetry anomalies detected yet for this room.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {events.map((evt, idx) => (
                        <div
                          key={evt.id || idx}
                          className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1 transition-all ${getSeverityBadge(
                            evt.severity
                          )}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase tracking-wide">
                              {evt.event_type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] opacity-75 font-mono">
                              {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : "Just now"}
                            </span>
                          </div>
                          {evt.event_data && (
                            <div className="text-[11px] font-mono opacity-80">
                              {JSON.stringify(evt.event_data)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-xl">
                <Video className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Select an Interview Room</h3>
                <p className="text-xs">Choose a room from the left sidebar or create a new room to view live telemetry.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1">Create Interview Room</h3>
            <p className="text-sm text-slate-400 mb-6">
              Set up a room for candidate proctoring and telemetry.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Candidate / Interview Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fullstack Developer Test - Jordan"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}