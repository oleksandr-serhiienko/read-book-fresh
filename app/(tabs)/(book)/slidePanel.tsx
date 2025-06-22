// Updated slidePanel.tsx - Handle EmittedWord type
import React, { useState, useEffect } from 'react';
import { WordTranslationPanel } from './panel';
import { EmittedWord } from './components/events/slidePanelEvents';
import { database } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';

interface SlidePanelProps {
  isVisible: boolean;
  content: EmittedWord | null;
  onClose: () => void
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isVisible,
  content,
  onClose
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [displayContent, setDisplayContent] = useState<EmittedWord | null>(null);
  const { sourceLanguage, targetLanguage } = useLanguage();

  useEffect(() => {
    setIsAdded(false);
    setDisplayContent(content);
  }, [content]);

  if (!content || !isVisible) return null;

  const handleAddToDictionary = async () => {
    if (!displayContent) return;
    
    let noWord = await database.WordDoesNotExist(displayContent.word);
    if (!noWord) {
      return;
    }
    
    if (!isAdded) {
      await database.insertCard(content, sourceLanguage.toLowerCase(), targetLanguage.toLowerCase());
      setIsAdded(true);
    }
  };

  // Handle ResponseTranslation or converted EmittedWord
  if (displayContent) {
    return (
      <WordTranslationPanel
        content={displayContent}
        isVisible={isVisible}
        onClose={onClose}
        onAddToDictionary={handleAddToDictionary}
        isAdded={isAdded}
      />
    );
  }

  return null;
};

export default SlidePanel;