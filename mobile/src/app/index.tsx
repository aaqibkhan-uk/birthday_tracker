import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Placeholder home screen. Replaced by the Upcoming tab in Milestone 1.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Birthday Cards</Text>
      <Text style={styles.subtitle}>Milestone 0 scaffold</Text>
      {/* TEMPORARY (Milestone 0 spike): remove with the dev-notifications screen. */}
      <Link href="/dev-notifications" style={styles.link}>
        Open notification spike
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
  link: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f4ea8',
    textDecorationLine: 'underline',
  },
});
