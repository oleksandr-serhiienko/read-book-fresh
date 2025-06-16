import { useLocalSearchParams } from 'expo-router';
import { WordInfoContent } from '../../shared/wordInfo';

export default function CardWordInfo() {
  const { content, added } = useLocalSearchParams<{ content: string, added: string }>();
  
  return (
    <WordInfoContent 
      content={content} 
      initialIsAdded={added === 'true'} 
    />
  );
}