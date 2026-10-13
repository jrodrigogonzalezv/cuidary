import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/theme/colors';

async function compress(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 480 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

export function PhotoPicker({
  name,
  photoUrl,
  size = 88,
  onChange,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
  onChange: (dataUri: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function captureFrom(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', source === 'camera' ? 'Activa el acceso a la cámara.' : 'Activa el acceso a tus fotos.');
      return;
    }
    const pickerOptions: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync({ ...pickerOptions, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const dataUri = await compress(result.assets[0].uri);
      onChange(dataUri);
    } finally {
      setBusy(false);
    }
  }

  function pick() {
    Alert.alert('Foto', '¿Cómo quieres agregar la foto?', [
      { text: 'Tomar foto', onPress: () => captureFrom('camera') },
      { text: 'Elegir de galería', onPress: () => captureFrom('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <Pressable onPress={pick} disabled={busy} style={styles.wrap}>
      <Avatar name={name} size={size} photoUrl={photoUrl} />
      <View style={styles.badge}>{busy ? <ActivityIndicator size="small" color={colors.white} /> : <FontAwesome name="camera" size={13} color={colors.white} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
