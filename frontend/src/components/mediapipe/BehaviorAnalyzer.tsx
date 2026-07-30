"use client";

import { useEffect, useRef, useState } from "react";
import CameraFeed from "./CameraFeed";
import { telemetryApi } from "@/lib/api";

interface BehaviorAnalyzerProps {
  roomId: string;
  userId: string;
  onEventDetected?: (event: any) => void;
}

interface EventData {
  type: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
  confidence: number;
  details?: Record<string, any>;
}

export default function BehaviorAnalyzer({
  roomId,
  userId,
  onEventDetected,
}: BehaviorAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [status, setStatus] = useState<"idle" | "scanning" | "analyzing">("idle");

  useEffect(() => {
    // Initialize MediaPipe setup
    const initMediaPipe = async () => {
      setStatus("scanning");
      setIsAnalyzing(true);

      // In a real implementation, we would initialize MediaPipe here
      // For now, we'll simulate the analysis loop

      // Simulate gaze deviation detection
      const gazeInterval = setInterval(() => {
        if (Math.random() > 0.8) {
          handleGazeDeviation();
        }
      }, 3000);

      // Simulate hand presence detection
      const handInterval = setInterval(() => {
        if (Math.random() > 0.9) {
          handleHandPresence();
        }
      }, 5000);

      return () => {
        clearInterval(gazeInterval);
        clearInterval(handInterval);
      };
    };

    const cleanup = initMediaPipe();

    return () => {
      // Cleanup intervals
    };
  }, [roomId, userId]);

  const handleGazeDeviation = async () => {
    const event: EventData = {
      type: "gaze_deviation",
      severity: "medium",
      timestamp: new Date().toISOString(),
      confidence: 0.85,
      details: {
        direction: "away_from_screen",
        duration_ms: 3500,
      },
    };
    setEvents((prev) => [event, ...prev]);
    onEventDetected?.(event);

    if (roomId) {
      try {
        await telemetryApi.submit({
          room_id: roomId,
          user_id: userId,
          event_type: event.type,
          event_data: event.details,
          severity: event.severity,
        });
      } catch (err) {
        console.error("Telemetry submit error", err);
      }
    }
  };

  const handleHandPresence = async () => {
    const event: EventData = {
      type: "hand_presence",
      severity: "low",
      timestamp: new Date().toISOString(),
      confidence: 0.75,
      details: {
        location: "lower_third",
        duration_ms: 2000,
      },
    };
    setEvents((prev) => [event, ...prev]);
    onEventDetected?.(event);

    if (roomId) {
      try {
        await telemetryApi.submit({
          room_id: roomId,
          user_id: userId,
          event_type: event.type,
          event_data: event.details,
          severity: event.severity,
        });
      } catch (err) {
        console.error("Telemetry submit error", err);
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isAnalyzing ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
          Behavior Analysis
        </h3>
        <p className="text-sm text-gray-500">
          Proctoring system is monitoring your video feed for suspicious behavior.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Video Feed</h3>
        </div>
        <div className="relative aspect-video bg-black">
          <CameraFeed videoRef={videoRef} facingMode="user" />
          {isAnalyzing && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              AI Monitor Active
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 max-h-64 overflow-y-auto">
        <h3 className="font-semibold mb-2">Recent Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No events detected yet</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event, index) => (
              <li
                key={index}
                className={`p-2 rounded border ${getSeverityColor(event.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium capitalize">
                    {event.type.replace("_", " ")}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs mt-1 opacity-75">
                  Confidence: {(event.confidence * 100).toFixed(0)}% | Severity:{" "}
                  {event.severity.toUpperCase()}
                </div>
                {event.details && (
                  <div className="text-xs mt-1 opacity-75 font-mono">
                    {Object.entries(event.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}