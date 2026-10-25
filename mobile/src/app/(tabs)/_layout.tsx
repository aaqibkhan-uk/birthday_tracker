import { router, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, type ColorValue } from 'react-native';
import { colors, fonts, fontSize, radius, spacing } from '../../theme';

function tabIcon(name: SymbolViewProps['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

function AddFriendButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add friend"
      hitSlop={8}
      onPress={() => router.push('/friend/new')}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      <Text style={styles.headerButtonText}>+ Add</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontSize: fontSize.heading,
          fontWeight: '700',
          color: colors.text,
        },
        headerRight: AddFriendButton,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Upcoming',
          tabBarIcon: tabIcon({ ios: 'gift', android: 'cake' }),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: tabIcon({ ios: 'person.2', android: 'group' }),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerRight: undefined,
          tabBarIcon: tabIcon({ ios: 'shippingbox', android: 'local_shipping' }),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.8 },
  headerButtonText: { fontSize: fontSize.small + 1, color: colors.primaryText, fontWeight: '700' },
});
