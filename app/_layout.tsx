import React, { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LanguageProvider, useLanguage } from './languageSelector';
import LanguageSelector from '@/components/languageComponent';

function HeaderContent() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = useLanguage();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Only reload after initial render
    router.replace('/(tabs)');
  }, [sourceLanguage, targetLanguage]);
  
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>ReadApp</Text>
      <LanguageSelector
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSourceLanguageChange={setSourceLanguage}
        onTargetLanguageChange={setTargetLanguage}
      />
    </View>
  );
}

function LayoutWithLanguageSelector() {
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerTitle: () => <HeaderContent />,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <LayoutWithLanguageSelector />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});