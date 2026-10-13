import { TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';

function extractDigits(raw: string) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('56')) digits = digits.slice(2);
  if (digits.startsWith('9')) digits = digits.slice(1);
  return digits.slice(0, 8);
}

export function formatChileanPhone(raw: string) {
  const digits = extractDigits(raw);
  if (!digits) return '';
  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 8);
  return `+56 9 ${part1}${part2 ? ' ' + part2 : ''}`;
}

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (next: string) => void;
  style?: TextInputProps['style'];
};

export function PhoneInput({ value, onChangeText, style, placeholder, ...rest }: Props) {
  return (
    <TextInput
      {...rest}
      style={style}
      value={value}
      onChangeText={(text) => onChangeText(formatChileanPhone(text))}
      onFocus={(e) => {
        if (!value) onChangeText('+56 9 ');
        rest.onFocus?.(e);
      }}
      keyboardType="phone-pad"
      placeholder={placeholder ?? '+56 9 1234 5678'}
      placeholderTextColor={colors.muted}
      maxLength={14}
    />
  );
}
