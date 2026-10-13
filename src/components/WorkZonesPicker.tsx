import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CHILE_REGIONS } from '@/data/chileLocations';
import { SelectModal } from '@/components/SelectModal';
import { colors } from '@/theme/colors';

export function WorkZonesPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [regionModal, setRegionModal] = useState(false);
  const [activeRegionCode, setActiveRegionCode] = useState<string>(CHILE_REGIONS.find((r) => r.code === 'RM')?.code ?? CHILE_REGIONS[0].code);
  const activeRegion = CHILE_REGIONS.find((r) => r.code === activeRegionCode);

  function toggleComuna(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  return (
    <View>
      <Pressable style={styles.selectRow} onPress={() => setRegionModal(true)}>
        <Text style={styles.selectText}>{activeRegion?.name ?? 'Elige una región'}</Text>
        <FontAwesome name="chevron-down" size={13} color={colors.muted} />
      </Pressable>

      <View style={styles.chipGrid}>
        {activeRegion?.comunas.map((c) => {
          const selected = value.includes(c.name);
          return (
            <Pressable key={c.code} style={[styles.chip, selected && styles.chipActive]} onPress={() => toggleComuna(c.name)}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {value.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Zonas seleccionadas ({value.length})</Text>
          <View style={styles.chipGrid}>
            {value.map((name) => (
              <Pressable key={name} style={styles.chipSelected} onPress={() => toggleComuna(name)}>
                <Text style={styles.chipSelectedText}>{name}</Text>
                <FontAwesome name="close" size={10} color={colors.primaryDark} style={{ marginLeft: 6 }} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <SelectModal
        visible={regionModal}
        title="Elige una región"
        options={CHILE_REGIONS}
        selectedCode={activeRegionCode}
        onClose={() => setRegionModal(false)}
        onSelect={(option) => setActiveRegionCode(option.code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.bgSoft,
    marginBottom: 12,
  },
  selectText: { fontSize: 15, color: colors.ink },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.lavender, borderColor: colors.lavender },
  chipText: { color: colors.muted, fontSize: 12.5, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  summary: { marginTop: 16 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelectedText: { color: colors.primaryDark, fontSize: 12.5, fontWeight: '700' },
});
