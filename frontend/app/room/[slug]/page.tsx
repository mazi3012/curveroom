"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveKitStore } from "@/lib/hooks";
import { roomApi } from "@/lib/api";
import BehaviorAnalyzer from "@/components/mediapipe/BehaviorAnalyzer";
import {
  Video,
  ShieldCheck,
  LogOut,
  QrCode,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { connect, disconnect, isConnected, error, reset } = useLiveKitStore();
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        const response = await roomApi.get(slug);
        setRoomData(response.data);

        // Join room
        const joinResponse = await roomApi.join(slug);
        setRoomData((prev: any) => ({ ...prev, ...joinResponse.data }));

        if (joinResponse.data.livekit_token && joinResponse.data.livekit_url) {
          try {
            await connect(
              joinResponse.data.livekit_token,
              joinResponse.data.livekit_url
            );
          } catch (lkErr) {
            console.warn("LiveKit server not connected, using client-side fallback camera feed");
          }
        }
      } catch (err: any) {
        setErrorText(err.response?.data?.detail || "Failed to load room session");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [slug, connect]);

  const handleLeaveRoom = async () => {
    try {
      await disconnect();
    } catch (e) { }
    reset();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-blue-500/20" />
          <h3 className="text-xl font-bold text-white">Initializing Proctoring Room...</h3>
          <p className="text-sm text-slate-400">Setting up secure encryption & edge vision</p>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Room Error</h2>
          <p className="text-slate-400 text-sm mb-6">{errorText}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-all text-sm"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                {roomData?.name || "Proctoring Session"}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Slug: {roomData?.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {roomData?.role?.toUpperCase() || "CANDIDATE"}
            </span>

            {roomData?.qr_code && (
              <button
                onClick={() => setShowQR(!showQR)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                Mobile QR
              </button>
            )}

            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Video feeds & AI Analyzer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary & Secondary Dual Feed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Feed with MediaPipe AI */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    Primary Feed (Webcam + Edge CV)
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Live AI
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
                  <BehaviorAnalyzer
                    roomId={roomData?.room_id || roomData?.id || slug}
                    userId={roomData?.participant_id || "candidate_user"}
                  />
                </div>
              </div>

              {/* Secondary Feed (Mobile View / QR Code) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      Secondary Feed (Mobile Spatial Angle)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Dual Angle
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Scan QR code with your mobile device to stream secondary workstation angle.
                  </p>
                </div>

                <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center p-4 text-center">
                  {roomData?.qr_code ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <img
                        src={`data:image/png;base64,${roomData.qr_code}`}
                        alt="Mobile QR Code"
                        className="w-28 h-28 rounded-lg bg-white p-1 shadow-md"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">
                        Scan to Pair Mobile Camera
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-slate-500">
                      <Smartphone className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                      <p className="text-xs">Secondary stream ready for mobile connection</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proctoring Instructions Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 via-slate-900 to-slate-900 border border-blue-500/20 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Active Telemetry & Proctoring Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Maintain head facing forward within primary camera frame</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Keep secondary mobile camera positioned at 45° angle</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Avoid background conversation or unauthorized device usage</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>AI edge models send encrypted behavioral flags to interviewer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Room Session Metadata & Quick Actions */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Session Metadata
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Room Status</span>
                  <span className="text-emerald-400 font-semibold uppercase">{roomData?.status || "Active"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Candidate Identity</span>
                  <span className="text-slate-200 font-mono">{roomData?.participant_id?.slice(0, 10) || "connected"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">LiveKit WebRTC</span>
                  <span className="text-blue-400 font-semibold">{isConnected ? "Connected" : "Simulated Local"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Expires At</span>
                  <span className="text-slate-300 font-mono">
                    {roomData?.expires_at ? new Date(roomData.expires_at).toLocaleTimeString() : "2 Hours"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}