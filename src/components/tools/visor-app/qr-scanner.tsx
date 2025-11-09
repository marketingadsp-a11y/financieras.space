
"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QrScannerProps = {
  onSuccess: (data: string, location: GeolocationCoordinates) => void;
  onCancel: () => void;
};

export function QrScanner({ onSuccess, onCancel }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [permissionStatus, setPermissionStatus] = React.useState<'pending' | 'camera_granted' | 'denied'>('pending');
  const [location, setLocation] = React.useState<GeolocationCoordinates | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    const getPermissionsAndStream = async () => {
      // 1. Get Geolocation
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        if (isCancelled) return;
        setLocation(position.coords);
      } catch (error) {
        if (isCancelled) return;
        console.error("Error accessing geolocation:", error);
        setPermissionStatus('denied');
        toast({
          variant: "destructive",
          title: "Permiso de Ubicación Requerido",
          description: "La ubicación es necesaria para registrar la visita. Por favor, habilita los permisos.",
        });
        return;
      }

      // 2. Get Camera Stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (isCancelled) {
          stream?.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPermissionStatus('camera_granted');
      } catch (error) {
        if (isCancelled) return;
        console.error("Error accessing camera:", error);
        setPermissionStatus('denied');
        toast({
          variant: "destructive",
          title: "Acceso a Cámara Denegado",
          description: "Por favor, habilita los permisos de cámara en tu navegador.",
        });
      }
    };

    getPermissionsAndStream();
    
    return () => {
      isCancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);
  
  React.useEffect(() => {
    if (permissionStatus !== 'camera_granted' || !location) return;

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
            onSuccess(code.data, location);
            return; // Stop scanning
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [permissionStatus, location, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="relative w-full max-w-lg aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
        {permissionStatus === 'camera_granted' ? (
             <video ref={videoRef} className="w-full h-full object-cover rounded-lg" autoPlay playsInline muted />
        ) : (
             <div className="text-white text-center">
                {permissionStatus === 'pending' && <><Loader2 className="animate-spin h-8 w-8 mb-4"/> <p>Solicitando permisos...</p></>}
                {permissionStatus === 'denied' && <VideoOff className="h-12 w-12 text-destructive"/>}
             </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-8 border-white/50 rounded-lg" style={{ clipPath: "polygon(0% 0%, 0% 100%, 20% 100%, 20% 20%, 80% 20%, 80% 80%, 20% 80%, 20% 100%, 100% 100%, 100% 0%)" }}></div>
      </div>
      <div className="mt-4 p-4 text-center text-white bg-black/50 rounded-lg max-w-lg">
        {permissionStatus === 'pending' && <p>Por favor, autoriza el acceso a la cámara y a la ubicación.</p>}
        {permissionStatus === 'denied' && (
             <Alert variant="destructive">
                <MapPinOff className="h-4 w-4"/>
                <AlertTitle>Permiso Denegado</AlertTitle>
                <AlertDescription>
                    No se puede continuar sin acceso a la cámara y/o ubicación.
                    Por favor, recarga y acepta los permisos.
                </AlertDescription>
            </Alert>
        )}
        {permissionStatus === 'camera_granted' && <p>Apunta la cámara al código QR</p>}
      </div>
      <Button onClick={onCancel} variant="secondary" className="mt-8">
        Cancelar
      </Button>
    </div>
  );
}
