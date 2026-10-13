import { Redirect, Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function CaregiverLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile || profile.role !== 'cuidador') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 24,
          height: 64,
          borderRadius: 24,
          backgroundColor: colors.white,
          borderTopWidth: 0,
          shadowColor: '#4B3F72',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Turnos',
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="clock-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shift/[id]"
        options={{
          href: null,
          title: 'Turno',
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Ofertas',
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="briefcase" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Notificaciones',
        }}
      />
      <Tabs.Screen
        name="credential"
        options={{
          href: null,
          title: 'Credencial',
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          title: 'Editar perfil',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
