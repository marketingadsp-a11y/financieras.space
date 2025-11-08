
"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QrScannerProps = {
  onSuccess: (data: string) => void;
  onCancel: () => void;
};

export function QrScanner({ onSuccess, onCancel }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasPermission(false);
        toast({
          variant: "destructive",
          title: "Acceso a Cámara Denegado",
          description: "Por favor, habilita los permisos de cámara en tu navegador.",
        });
      }
    };
    getCameraPermission();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);
  
  React.useEffect(() => {
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
            onSuccess(code.data);
            return; // Stop scanning
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (hasPermission) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasPermission, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="relative w-full max-w-lg aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-8 border-white/50 rounded-lg" style={{ clipPath: "polygon(0% 0%, 0% 100%, 20% 100%, 20% 20%, 80% 20%, 80% 80%, 20% 80%, 20% 100%, 100% 100%, 100% 0%)" }}></div>
      </div>
      <div className="mt-4 p-4 text-center text-white bg-black/50 rounded-lg">
        {hasPermission === null && <><Loader2 className="animate-spin inline-block mr-2"/> Solicitando permiso de cámara...</>}
        {hasPermission === false && <Alert variant="destructive"><VideoOff className="h-4 w-4"/><AlertTitle>Cámara no disponible</AlertTitle><AlertDescription>No se pudo acceder a la cámara.</AlertDescription></Alert>}
        {hasPermission === true && <p>Apunta la cámara al código QR</p>}
      </div>
      <Button onClick={onCancel} variant="secondary" className="mt-8">
        Cancelar
      </Button>
    </div>
  );
}
