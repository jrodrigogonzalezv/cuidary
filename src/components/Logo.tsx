import { Image } from 'react-native';

const MARK_ASPECT = 447 / 408;
const FULL_ASPECT = 1615 / 408;

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo-mark.png')}
      style={{ width: size * MARK_ASPECT, height: size }}
      resizeMode="contain"
    />
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo-full.png')}
      style={{ width: size * FULL_ASPECT, height: size }}
      resizeMode="contain"
    />
  );
}
