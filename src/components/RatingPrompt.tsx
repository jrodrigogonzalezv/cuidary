import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doc, getDoc, runTransaction } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Shift, UserProfile } from '@/types/models';
import { StarRatingInput } from '@/components/StarRating';
import { colors } from '@/theme/colors';

export function RatingPrompt({ shift, patientName }: { shift: Shift; patientName: string }) {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'ratings', shift.id)).then((snapshot) => {
      setAlreadyRated(snapshot.exists());
      setChecked(true);
    });
  }, [shift.id]);

  async function handleSubmit() {
    if (!user || stars === 0) return;
    setSubmitting(true);
    try {
      const ratingRef = doc(db, 'ratings', shift.id);
      const caregiverRef = doc(db, 'users', shift.caregiverUid);
      await runTransaction(db, async (tx) => {
        const caregiverSnap = await tx.get(caregiverRef);
        const data = (caregiverSnap.data() ?? {}) as UserProfile;
        const prevCount = data.ratingCount ?? 0;
        const prevAvg = data.ratingAvg ?? 0;
        const nextCount = prevCount + 1;
        const nextAvg = (prevAvg * prevCount + stars) / nextCount;
        tx.set(ratingRef, {
          shiftId: shift.id,
          caregiverUid: shift.caregiverUid,
          familyUid: user.uid,
          patientName,
          stars,
          comment: comment.trim() || null,
          createdAt: Date.now(),
        });
        tx.update(caregiverRef, { ratingAvg: nextAvg, ratingCount: nextCount });
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!checked || alreadyRated) return null;

  if (done) {
    return (
      <View style={styles.doneCard}>
        <FontAwesome name="check-circle" size={20} color={colors.success} />
        <Text style={styles.doneText}>¡Gracias por tu evaluación!</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>¿Cómo estuvo {shift.caregiverName}?</Text>
      <Text style={styles.subtitle}>Tu calificación ayuda a otras familias a elegir con confianza.</Text>
      <View style={styles.starsRow}>
        <StarRatingInput value={stars} onChange={setStars} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Deja un comentario (opcional)"
        placeholderTextColor={colors.muted}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <Pressable style={[styles.button, stars === 0 && styles.buttonDisabled]} onPress={handleSubmit} disabled={stars === 0 || submitting}>
        {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Enviar evaluación</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 12 },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  starsRow: { alignItems: 'center', paddingVertical: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700' },
  doneCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: 16,
    padding: 16,
  },
  doneText: { color: colors.success, fontWeight: '700' },
});
