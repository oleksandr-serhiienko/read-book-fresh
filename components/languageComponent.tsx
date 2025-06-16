import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';

type LanguageCode = keyof typeof SupportedLanguages;
type LanguageEntry = [LanguageCode, string];

interface LanguageSelectorProps {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onSourceLanguageChange: (language: LanguageCode) => void;
  onTargetLanguageChange: (language: LanguageCode) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<'source' | 'target'>('source');

  const openModal = (type: 'source' | 'target') => {
    setCurrentSelection(type);
    setModalVisible(true);
  };

  const selectLanguage = (language: LanguageCode) => {
    if (currentSelection === 'source') {
      onSourceLanguageChange(language);
    } else {
      onTargetLanguageChange(language);
    }
    setModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: LanguageEntry }) => (
    <TouchableOpacity style={styles.languageItem} onPress={() => selectLanguage(item[0])}>
      <Text>{item[1]}</Text>
    </TouchableOpacity>
  );

  const languageEntries: LanguageEntry[] = Object.entries(SupportedLanguages) as LanguageEntry[];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.languageButton} onPress={() => openModal('source')}>
        <Text style={styles.languageText}>{SupportedLanguages[sourceLanguage].slice(0, 3)}</Text>
      </TouchableOpacity>
      <Text style={styles.arrow}>→</Text>
      <TouchableOpacity style={styles.languageButton} onPress={() => openModal('target')}>
        <Text style={styles.languageText}>{SupportedLanguages[targetLanguage].slice(0, 3)}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            Select {currentSelection === 'source' ? 'Source' : 'Target'} Language
          </Text>
          <FlatList
            data={languageEntries}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item[0]}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  languageButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  languageText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 16,
    marginHorizontal: 5,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  languageItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    width: '100%',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LanguageSelector;