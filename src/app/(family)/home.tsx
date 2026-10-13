import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addDoc, collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { DependencyLevel, Patient } from '@/types/models';
import { colors, cardPalettes } from '@/theme/colors';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FieldError } from '@/components/FieldError';
import { StatTile } from '@/components/StatTile';
import { FadeInUp } from '@/components/FadeInUp';
import { Pulse } from '@/components/Pulse';
import { ScreenHeader } from '@/components/ScreenHeader';
import { isValidAge, isValidName } from '@/lib/validators';

const dependencyLabel: Record<DependencyLevel, string> = {
  autovalente: 'Autovalente',
  moderada: 'Dependencia moderada',
  severa: 'Dependencia severa',
};

const dependencyOptions: DependencyLevel[] = ['autovalente', 'moderada', 'severa'];

interface FormErrors {
  name?: string;
  age?: string;
  comuna?: string;
}

export default function FamilyHome() {
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [comuna, setComuna] = useState('');
  const [dependencyLevel, setDependencyLevel] = useState<DependencyLevel>('autovalente');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'patients'), where('familyUids', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPatients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Patient));
      },
      () => setPatients([]),
    );
    return unsubscribe;
  }, [user]);

  async function handleAddPatient() {
    if (!user) return;
    const errors: FormErrors = {};
    if (!isValidName(name)) errors.name = 'Ingresa el nombre completo.';
    if (!isValidAge(age)) errors.age = 'Ingresa una edad válida.';
    if (!comuna.trim()) errors.comuna = 'Ingresa la comuna.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert('Revisa estos campos', Object.values(errors).join('\n'));
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'patients'), {
        name: name.trim(),
        age: Number(age),
        comuna: comuna.trim(),
        dependencyLevel,
        familyUids: [user.uid],
        activeShiftId: null,
      });
      setName('');
      setAge('');
      setComuna('');
      setDependencyLevel('autovalente');
      setFieldErrors({});
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  const liveCount = patients.filter((p) => p.activeShiftId).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bitácora" />
      <ScrollView contentContainerStyle={styles.content}>
      <DashboardHeader name={profile?.name ?? 'Familia'} subtitle="Bienestar de tu familiar" photoUrl={profile?.photoUrl} />

      <FadeInUp>
        <View style={styles.statsRow}>
          <StatTile
            icon="heart"
            label="Pacientes registrados"
            value={String(patients.length)}
            bg={colors.primarySoft}
            fg={colors.primary}
          />
          <StatTile
            icon="map-marker"
            label="Turnos en vivo"
            value={String(liveCount)}
            bg={colors.mintSoft}
            fg={colors.mint}
          />
        </View>
      </FadeInUp>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tu familiar</Text>
        <Pressable style={styles.addButton} onPress={() => setShowForm((v) => !v)}>
          <FontAwesome name={showForm ? 'close' : 'plus'} size={15} color={colors.white} />
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Registrar paciente</Text>
          <TextInput
            style={[styles.input, fieldErrors.name && styles.inputError]}
            placeholder="Nombre completo"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
          <FieldError message={fieldErrors.name} />
          <View style={styles.row}>
            <View style={styles.inputSmall}>
              <TextInput
                style={[styles.input, fieldErrors.age && styles.inputError]}
                placeholder="Edad"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
              <FieldError message={fieldErrors.age} />
            </View>
            <View style={styles.inputGrow}>
              <TextInput
                style={[styles.input, fieldErrors.comuna && styles.inputError]}
                placeholder="Comuna"
                placeholderTextColor={colors.muted}
                value={comuna}
                onChangeText={setComuna}
              />
              <FieldError message={fieldErrors.comuna} />
            </View>
          </View>
          <View style={styles.pillRow}>
            {dependencyOptions.map((level) => (
              <Pressable
                key={level}
                style={[styles.pill, dependencyLevel === level && styles.pillActive]}
                onPress={() => setDependencyLevel(level)}
              >
                <Text style={[styles.pillText, dependencyLevel === level && styles.pillTextActive]}>
                  {dependencyLabel[level]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.submitButton} onPress={handleAddPatient} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      )}

      {patients.length === 0 && !showForm ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <FontAwesome name="heartbeat" size={28} color={colors.primary} />
          </View>
          <Text style={styles.empty}>Aún no tienes pacientes vinculados a tu cuenta.</Text>
          <Pressable onPress={() => setShowForm(true)}>
            <Text style={styles.emptyLink}>Registrar a tu familiar</Text>
          </Pressable>
        </View>
      ) : (
        patients.map((item, index) => {
          const palette = cardPalettes[index % cardPalettes.length];
          return (
            <FadeInUp key={item.id} delay={index * 70}>
              <Pressable
                style={[styles.card, { backgroundColor: palette.bg }]}
                onPress={() => router.push(`/(family)/patient/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.cardAvatar} />
                  ) : (
                    <View style={[styles.cardAvatar, { backgroundColor: palette.fg }]}>
                      <FontAwesome name="user" size={18} color={colors.white} />
                    </View>
                  )}
                  {item.activeShiftId ? (
                    <View style={styles.liveBadge}>
                      <Pulse>
                        <View style={styles.liveDot} />
                      </Pulse>
                      <Text style={styles.liveBadgeText}>EN VIVO</Text>
                    </View>
                  ) : (
                    <FontAwesome name="chevron-right" size={14} color={palette.fg} />
                  )}
                </View>
                <Text style={[styles.cardName, { color: colors.ink }]}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.age} años · {item.comuna}
                </Text>
                <View style={[styles.levelPill, { backgroundColor: colors.white }]}>
                  <Text style={[styles.levelPillText, { color: palette.fg }]}>
                    {dependencyLabel[item.dependencyLevel]}
                  </Text>
                </View>
              </Pressable>
            </FadeInUp>
          );
        })
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#4B3F72',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  formTitle: { fontWeight: '700', color: colors.ink, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
  inputSmall: { width: 90 },
  inputGrow: { flex: 1 },
  inputError: { borderColor: colors.primary },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pillText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: colors.primary },
  submitButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: colors.white, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 24, gap: 10, paddingVertical: 24 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center' },
  emptyLink: { color: colors.primary, fontWeight: '700' },
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 19, fontWeight: '800' },
  cardMeta: { color: colors.muted, marginTop: 2, fontWeight: '500' },
  levelPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  levelPillText: { fontSize: 12, fontWeight: '700' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.live,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
