// hooks/useChapterData.ts
import { useState } from 'react';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { logger, LogCategories } from '@/utils/logger';

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
        logger.warn(LogCategories.CHAPTER_DATA, "Database not initialized");
        return;
      }
      // Get sentences for specific chapter
      const sentences = await db.getChapterSentences(chapterNumber);
      logger.debug(LogCategories.CHAPTER_DATA, `Loading chapter ${chapterNumber}`, { chapterNumber, sentenceCount: sentences.length });
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

export default useChapterData;