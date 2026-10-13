import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#EF4444" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/(auth)/complete-profile" />;
  if (profile.role === 'cuidador') return <Redirect href="/(caregiver)/home" />;
  return <Redirect href="/(family)/home" />;
}
