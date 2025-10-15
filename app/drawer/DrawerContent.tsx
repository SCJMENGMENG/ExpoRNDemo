import { useRouter } from 'expo-router';
import React from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDrawer } from './RootDrawer';

const MENU = [
  { icon: '🏠', label: '首页', route: '/child/target' },
  { icon: '👤', label: '个人中心', route: '/child/threads' },
  { icon: '⚙️', label: '设置', route: '/settings' },
  { icon: '🚪', label: '退出登录', route: '/logout' },
];

export default function DrawerContent() {
  const router = useRouter();
  const { closeDrawer } = useDrawer();

  const onPress = (route: string) => {
    // router paths in this app may vary; force any path as any to avoid type errors
    try {
      router.push(route as any);
    } catch (e) {
      console.log('navigate error', e);
    }
    closeDrawer();
  };

  return (
    <View style={styles.container}>
      <View style={{ height: 50 }} />
      <Button title="关闭菜单" onPress={closeDrawer} />
      <Text style={styles.title}>菜单</Text>
      <FlatList
        data={MENU}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onPress(item.route)}>
            <Text style={styles.menuItem}>{item.icon} {item.label}</Text>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  menuItem: { fontSize: 20, marginVertical: 10 },
});
