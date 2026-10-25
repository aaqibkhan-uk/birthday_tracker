import { router, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, type ColorValue } from 'react-native';
import { colors, fontSize, spacing } from '../../theme';

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
      style={styles.headerButton}
    >
      <Text style={styles.headerButtonText}>Add</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
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
  headerButton: { paddingHorizontal: spacing.md },
  headerButtonText: { fontSize: fontSize.body, color: colors.primary, fontWeight: '600' },
});
