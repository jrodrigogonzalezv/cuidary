import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CHILE_REGIONS } from '@/data/chileLocations';
import type { Address } from '@/types/models';
import { SelectModal } from '@/components/SelectModal';
import { colors } from '@/theme/colors';

export function AddressPicker({ value, onChange }: { value: Partial<Address>; onChange: (next: Partial<Address>) => void }) {
  const [regionModal, setRegionModal] = useState(false);
  const [comunaModal, setComunaModal] = useState(false);

  const region = CHILE_REGIONS.find((r) => r.code === value.regionCode);
  const comunas = region?.comunas ?? [];

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={styles.label}>Región</Text>
        <Pressable style={styles.selectRow} onPress={() => setRegionModal(true)}>
          <Text style={[styles.selectText, !value.regionName && styles.placeholder]}>
            {value.regionName ?? 'Selecciona tu región'}
          </Text>
          <FontAwesome name="chevron-down" size={13} color={colors.muted} />
        </Pressable>
      </View>

      <View>
        <Text style={styles.label}>Comuna</Text>
        <Pressable
          style={[styles.selectRow, !region && styles.selectRowDisabled]}
          onPress={() => region && setComunaModal(true)}
        >
          <Text style={[styles.selectText, !value.comunaName && styles.placeholder]}>
            {value.comunaName ?? (region ? 'Selecciona tu comuna' : 'Elige primero la región')}
          </Text>
          <FontAwesome name="chevron-down" size={13} color={colors.muted} />
        </Pressable>
      </View>

      <View>
        <Text style={styles.label}>Calle y número</Text>
        <TextInput
          style={styles.input}
          placeholder="Av. Siempre Viva 742"
          placeholderTextColor={colors.muted}
          value={value.street ?? ''}
          onChangeText={(street) => onChange({ ...value, street })}
        />
      </View>

      <SelectModal
        visible={regionModal}
        title="Elige tu región"
        options={CHILE_REGIONS}
        selectedCode={value.regionCode}
        onClose={() => setRegionModal(false)}
        onSelect={(option) =>
          onChange({ ...value, regionCode: option.code, regionName: option.name, comunaCode: undefined, comunaName: undefined })
        }
      />

      <SelectModal
        visible={comunaModal}
        title="Elige tu comuna"
        options={comunas}
        selectedCode={value.comunaCode}
        onClose={() => setComunaModal(false)}
        onSelect={(option) => onChange({ ...value, comunaCode: option.code, comunaName: option.name })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
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
  },
  selectRowDisabled: { opacity: 0.5 },
  selectText: { fontSize: 15, color: colors.ink },
  placeholder: { color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
});
