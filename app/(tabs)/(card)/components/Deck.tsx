import { TouchableOpacity, View, Text, StyleSheet, Dimensions, Image } from "react-native";
import React, { forwardRef, useEffect, useState } from 'react';

interface Theme {
  background: string;
  accent: string;
  title: string;
  count: string;
  imageUrl?: string;
}

interface DeckCardProps {
  theme: Theme;
  onPress: () => void;
  reviewCount?: number;
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

export const DeckCard = forwardRef<TouchableOpacity, DeckCardProps>(
  ({ theme, onPress, reviewCount }, ref) => {
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

    useEffect(() => {
      if (theme.imageUrl) {
        setLocalImageUrl(decodeURIComponent(theme.imageUrl));
      }
    }, [theme.imageUrl]);

    return (
      <TouchableOpacity 
        ref={ref}
        style={[styles.card, { backgroundColor: theme.background }]} 
        onPress={onPress}
      >
        <View style={[styles.accentCircle, styles.topCircle, { backgroundColor: theme.accent }]} />
        <View style={[styles.accentCircle, styles.bottomCircle, { backgroundColor: theme.accent }]} />
        
        {localImageUrl ? (
          <View style={styles.cornerImageContainer}>
            <Image 
              source={{ uri: localImageUrl }}
              style={styles.imageContent}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.cornerCurve, { backgroundColor: theme.accent }]} />
        )}
        
        <View style={styles.content}>
          <Text style={styles.title}>{theme.title}</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.countContainer, { backgroundColor: theme.accent }]}>
              <Text style={styles.countText}>{theme.count}</Text>
            </View>
            {reviewCount !== undefined && (
              <Text style={styles.reviewedText}>
                {reviewCount} reviewed today
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  reviewedText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  card: {
    width: cardWidth,
    height: 160,
    borderRadius: 20,
    marginVertical: 8,
    marginHorizontal: 'auto',
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  accentCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  topCircle: {
    top: 12,
    left: 12,
  },
  bottomCircle: {
    bottom: 12,
    right: 12,
  },
  cornerCurve: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  cornerImageContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    opacity: 0.8,
  },
  imageContent: {
    width: '150%',
    height: '150%',
    position: 'absolute',
    top: '-25%',
    left: '-25%',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  countContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
  },
  countText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DeckCard;