import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props extends ViewProps {
  variant?: 'background' | 'card';
}

export function ThemedView({ style, variant = 'background', ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        { backgroundColor: variant === 'card' ? theme.card : theme.background, flex: 1 },
        style,
      ]}
      {...rest}
    />
  );
}
