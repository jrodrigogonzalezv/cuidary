import { Image } from 'react-native';

export function QrCode({ data, size = 180 }: { data: string; size?: number }) {
  const uri = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  return <Image source={{ uri }} style={{ width: size, height: size }} />;
}
