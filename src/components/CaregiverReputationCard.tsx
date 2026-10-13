import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, limit, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { Rating } from '@/types/models';
import { RATING_TAG_LABEL, topTags } from '@/lib/ratingTags';
import { StarRatingDisplay } from '@/components/StarRating';
import { colors } from '@/theme/colors';

export function CaregiverReputationCard({
  caregiverUid,
  ratingAvg,
  ratingCount,
}: {
  caregiverUid: string;
  ratingAvg?: number;
  ratingCount?: number;
}) {
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'ratings'), where('caregiverUid', '==', caregiverUid), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(
      q,
      (snapshot) => setRatings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Rating)),
      () => setRatings([]),
    );
  }, [caregiverUid]);

  const badges = topTags(ratings);
  const lastComment = ratings.find((r) => r.comment);

  return (
    <View>
      <StarRatingDisplay value={ratingAvg ?? 0} count={ratingCount ?? 0} size={13} />
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map(({ tag, count }) => (
            <View key={tag} style={styles.badge}>
              <Text style={styles.badgeText}>
                {RATING_TAG_LABEL[tag]} · {count}
              </Text>
            </View>
          ))}
        </View>
      )}
      {lastComment && (
        <Text style={styles.comment}>
          &ldquo;{lastComment.comment}&rdquo; <Text style={styles.commentAuthor}>— familia de {lastComment.patientName}</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { backgroundColor: colors.mintSoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: colors.mint, fontSize: 11, fontWeight: '700' },
  comment: { color: colors.muted, fontSize: 12.5, marginTop: 8, lineHeight: 17, fontStyle: 'italic' },
  commentAuthor: { fontStyle: 'normal', fontWeight: '600' },
});
