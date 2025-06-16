// hooks/useChapterData.ts
import { useState } from 'react';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';

interface UseChapterDataProps {
  db: BookDatabase | null;
}

export const useChapterData = ({ db }: UseChapterDataProps) => {
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [chapterSentences, setChapterSentences] = useState<DBSentence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalChapters, setTotalChapters] = useState<number>(0);

  const loadChapter = async (chapterNumber: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (db === null) {
        console.log("Database not initialized");
        return;
      }
      // Get sentences for specific chapter
      const sentences = await db.getChapterSentences(chapterNumber);
      console.log("chapt num" + chapterNumber);
      setChapterSentences(sentences);
      
      // Get total chapters count if not already set
      if (totalChapters === 0) {
        const count = await db.getTotalChapters();
        setTotalChapters(count);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const nextChapter = () => {
    if (currentChapter < totalChapters - 1) {
      const nextChapterNum = currentChapter + 1;
      setCurrentChapter(nextChapterNum);
      loadChapter(nextChapterNum);
    }
  };

  const previousChapter = () => {
    if (currentChapter > 0) {
      const prevChapterNum = currentChapter - 1;
      setCurrentChapter(prevChapterNum);
      loadChapter(prevChapterNum);
    }
  };

  return {
    currentChapter,
    chapterSentences,
    isLoading,
    error,
    totalChapters,
    loadChapter,
    nextChapter,
    previousChapter
  };
};