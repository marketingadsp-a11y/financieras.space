
"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QrScannerProps = {
  onSuccess: (data: string, location: GeolocationCoordinates) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
};

export function QrScanner({ onSuccess, onError, onCancel }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        setErrorState("No se pudo acceder a la cámara. Por favor, revisa los permisos en tu navegador.");
      }
    };
    getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  React.useEffect(() => {
    if (!hasCameraPermission) return;

    let animationFrameId: number;

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            cancelAnimationFrame(animationFrameId); // Stop scanning
            // Now that we have a QR code, ask for location
            navigator.geolocation.getCurrentPosition(
              (position) => {
                onSuccess(code.data, position.coords);
              },
              (geoError) => {
                console.error("Geolocation error:", geoError);
                onError(new Error(geoError.message));
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, onSuccess, onError]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-lg aspect-square bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanner Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2/3 h-2/3 border-4 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        
        {!hasCameraPermission && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                {errorState ? (
                    <>
                        <VideoOff className="h-12 w-12 text-destructive mb-4"/>
                        <p className="text-center max-w-xs">{errorState}</p>
                    </>
                ) : (
                    <>
                        <Loader2 className="animate-spin h-8 w-8 mb-4"/>
                        <p>Iniciando cámara...</p>
                    </>
                )}
             </div>
        )}
      </div>
      <div className="mt-4 p-2 text-center text-white bg-black/50 rounded-lg max-w-lg">
        {hasCameraPermission && <p>Apunta la cámara al código QR del cliente</p>}
      </div>
      <Button onClick={onCancel} variant="secondary" className="mt-8">
        Cancelar Escaneo
      </Button>
    </div>
  );
}
