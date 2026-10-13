import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

export async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 480 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

async function captureFrom(source: 'camera' | 'library'): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permiso necesario', source === 'camera' ? 'Activa el acceso a la cámara.' : 'Activa el acceso a tus fotos.');
    return null;
  }
  const pickerOptions: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [4, 3], quality: 0.8 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync({ ...pickerOptions, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;
  return compressImage(result.assets[0].uri);
}

export function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Foto', '¿Cómo quieres agregar la foto?', [
      { text: 'Tomar foto', onPress: () => captureFrom('camera').then(resolve) },
      { text: 'Elegir de galería', onPress: () => captureFrom('library').then(resolve) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
