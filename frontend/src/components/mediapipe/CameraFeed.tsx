"use client";

import { useEffect, useRef, useState } from "react";

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  facingMode?: "user" | "environment";
  onFrame?: (landmarks: any) => void;
}

export default function CameraFeed({ 
  videoRef, 
  facingMode = "user",
  onFrame 
}: CameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setHasPermission(true);
      } catch (err: any) {
        setError(err.message || "Failed to access camera");
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, videoRef]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">Camera Access Error: {error}</p>
        <p className="text-sm text-red-500 mt-2">
          Please allow camera access for proctoring.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-black rounded-lg"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}