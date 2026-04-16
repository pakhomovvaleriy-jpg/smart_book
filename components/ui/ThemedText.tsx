import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props extends TextProps {
  variant?: 'primary' | 'secondary';
}

export function ThemedText({ style, variant = 'primary', ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      style={[{ color: variant === 'secondary' ? theme.textSecondary : theme.text }, style]}
      {...rest}
    />
  );
}
