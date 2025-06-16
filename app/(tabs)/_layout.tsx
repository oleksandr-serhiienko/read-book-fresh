import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(home)" options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}/>
      <Tabs.Screen name="(book)" options={{
            title: "Book",
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name='book' color={color} />,
            }} />
      <Tabs.Screen name="(card)" options={{
            title: "Cards",
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name='folder' color={color} />,
            }} />
      <Tabs.Screen name="(setting)" options={{
            title: "Settings",
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name='gear' color={color} />,
            }} />
    </Tabs>
  );
}
