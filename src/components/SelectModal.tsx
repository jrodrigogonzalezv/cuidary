import FontAwesome from '@expo/vector-icons/FontAwesome';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface Option {
  code: string;
  name: string;
}

export function SelectModal({
  visible,
  title,
  options,
  selectedCode,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedCode?: string;
  onSelect: (option: Option) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <FontAwesome name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item.code}
          style={styles.list}
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <Pressable
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item.name}</Text>
                {selected && <FontAwesome name="check" size={14} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,17,17,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  rowText: { fontSize: 15, color: colors.ink },
  rowTextSelected: { fontWeight: '700', color: colors.primaryDark },
});
