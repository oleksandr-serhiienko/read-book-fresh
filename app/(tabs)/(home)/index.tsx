import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { Link } from 'expo-router';
import { Book, Database, Card } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';
import { ArrowRight, BookOpen, GraduationCap, Clock, Trophy, Activity } from 'lucide-react-native';

export default function HomeScreen() {
  const [lastBook, setLastBook] = useState<Book | null>(null);
  const [learningStats, setLearningStats] = useState({
    totalCards: 0,
    cardsToReview: 0,
    streak: 0,
    todayLearned: 0
  });
  const { sourceLanguage, targetLanguage } = useLanguage();
  const database = new Database();

  useEffect(() => {
    const loadData = async () => {
      // Get the last read book
      const books = await database.getAllBooks(sourceLanguage.toLowerCase());
      const sortedBooks = books.sort((a, b) => 
        new Date(b.lastreadDate).getTime() - new Date(a.lastreadDate).getTime()
      );
      setLastBook(sortedBooks[0] || null);

      // Get learning statistics
      const cards = await database.getAllCards(
        sourceLanguage.toLowerCase(),
        targetLanguage.toLowerCase()
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      setLearningStats({
        totalCards: cards.length,
        cardsToReview: cards.filter(card => {
          const nextReview = new Date(card.lastRepeat);
          nextReview.setDate(nextReview.getDate() + Math.floor(card.level));
          return nextReview <= today;
        }).length,
        streak: calculateStreak(cards),
        todayLearned: cards.filter(card => {
          const lastRepeat = new Date(card.lastRepeat);
          return lastRepeat >= today;
        }).length
      });
    };

    loadData();
  }, [sourceLanguage, targetLanguage]);

  const calculateStreak = (cards: Card[]) => {
    // Simple streak calculation
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const hasActivity = cards.some(card => {
        const repeatDate = new Date(card.lastRepeat);
        return repeatDate.toDateString() === date.toDateString();
      });
      
      if (hasActivity) {
        streak++;
      } else if (i !== 0) {
        break;
      }
    }
    
    return streak;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {lastBook && (
            <Link
              href={{
                pathname: "/page",
                params: {
                  bookUrl: lastBook.bookUrl,
                  bookTitle: lastBook.name,
                  imageUrl: lastBook.imageUrl
                }
              }}
              asChild
            >
              <TouchableOpacity style={[styles.actionButton, styles.continueReading]}>
                <ImageBackground
                  source={{ uri: lastBook.imageUrl ?? "" }}
                  style={styles.bookCoverBackground}
                  imageStyle={styles.bookCoverImage}
                >
                  <View style={styles.buttonOverlay}>
                    <BookOpen color="white" size={24} />
                    <Text style={styles.actionButtonText}>Continue Reading</Text>
                    <Text style={styles.actionButtonSubtext} numberOfLines={1}>
                      {lastBook.name}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </Link>
          )}
          
          <Link  href={{
            pathname: '/approvalCard',  
            params: { source: "All Cards" }
            }} asChild>
            <TouchableOpacity style={[styles.actionButton, styles.startLearning]}>
              <View style={styles.buttonOverlay}>
                <GraduationCap color="white" size={24} />
                <Text style={styles.actionButtonText}>Start Learning</Text>
                <Text style={styles.actionButtonSubtext}>
                  {learningStats.cardsToReview} cards to review
                </Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Statistics */}
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Activity color="#3b82f6" size={20} />
              <Text style={styles.statText}>Today's Progress</Text>
            </View>
            <Text style={styles.statValue}>{learningStats.todayLearned}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Trophy color="#eab308" size={20} />
              <Text style={styles.statText}>Current Streak</Text>
            </View>
            <Text style={styles.statValue}>{learningStats.streak} days</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Clock color="#22c55e" size={20} />
              <Text style={styles.statText}>Total Cards</Text>
            </View>
            <Text style={styles.statValue}>{learningStats.totalCards}</Text>
          </View>
        </View>

        {/* Navigation Links */}
        <Link href="/(book)" asChild>
          <TouchableOpacity style={styles.navLink}>
            <Text style={styles.navLinkText}>Browse Books</Text>
            <ArrowRight size={20} color="#9ca3af" />
          </TouchableOpacity>
        </Link>

        <Link  href={{
          pathname: '/(card)'
        }} asChild>
          <TouchableOpacity style={styles.navLink}>
            <Text style={styles.navLinkText}>All Flashcards</Text>
            <ArrowRight size={20} color="#9ca3af" />
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    height: 120,
    padding: 0,
    borderRadius: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    elevation: 2,
  },
  buttonOverlay: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)', // Subtle dark overlay
    justifyContent: 'flex-end',
  },
  continueReading: {
    backgroundColor: '#2A4365', // Muted navy blue
  },
  startLearning: {
    backgroundColor: '#2F575D', // Muted teal
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bookCoverBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bookCoverImage: {
    opacity: 0.6, // Slightly dim the cover image
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 24,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1f2937',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4b5563',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  navLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  navLinkText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
});