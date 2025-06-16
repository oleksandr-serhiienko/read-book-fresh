import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import { Book, database } from '@/components/db/database';
import { Colors } from 'react-native/Libraries/NewAppScreen';

interface ServerBook {
  title: string;
  fileName: string;
  fileType: string;
  coverImage: string | null;
}

const { width } = Dimensions.get('window');
const myBookWidth = width * 0.4;
const otherBookHeight = 150;

const BookScreen: React.FC = () => {
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [otherBooks, setOtherBooks] = useState<ServerBook[]>([]);
  const serverUrl = "http://192.168.1.41:3000";
  const { sourceLanguage } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      console.log('[BOOKS_FETCH] Screen focused, fetching books');
      fetchAllBooks();
    }, [sourceLanguage])
  );

  const fetchAllBooks = async () => {
    try {
      const localBooks = await database.getAllBooks(sourceLanguage.toLowerCase());
      setMyBooks(localBooks);
  
      const serverUrl1 = `${serverUrl}/books/${sourceLanguage.toLowerCase()}`;
      const response = await fetch(serverUrl1);
      const serverBooks: ServerBook[] = await response.json();
  
      // Filter books
      const uniqueServerBooks = serverBooks.filter(serverBook => 
        !localBooks.some(localBook => localBook.name === serverBook.title)
      );
      
      setOtherBooks(uniqueServerBooks);
    } catch (error) {
     console.log(error);
    }
  };

  const renderMyBookItem = (item: Book) => (
    <Link
      href={{
        pathname: "/page",
        params: {
          bookUrl: item.bookUrl,
          bookTitle: item.name,
          imageUrl: item.imageUrl
        }
      }}
      asChild>
      <TouchableOpacity style={styles.myBookItem}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.myBookCover} />
        ) : (
          <View style={styles.myBookPlaceholder}>
            <Text style={styles.placeholderText}>{item.name.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.myBookTitle} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
      </TouchableOpacity>
    </Link>
  );

  const renderOtherBookItem = (item: ServerBook) => (
    <Link
      href={{
        pathname: "/page",
        params: {
          bookUrl: `${serverUrl}/books/${item.fileName}`,
          bookTitle: item.title,
          imageUrl: `${serverUrl}/covers/${item.coverImage}`
        }
      }}
      asChild>
      <TouchableOpacity style={styles.otherBookItem}>
        {item.coverImage ? (
          <Image 
            source={{ uri: `${serverUrl}/covers/${item.coverImage}` }} 
            style={styles.otherBookCover} 
          />
        ) : (
          <View style={styles.otherBookPlaceholder}>
            <Text style={styles.placeholderText}>{item.title.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.otherBookInfo}>
          <Text style={styles.otherBookTitle}>{item.title}</Text>
          <Text style={styles.otherBookType}>{item.fileType}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Books</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {myBooks.map((book, index) => (
            <View key={book.name} style={index > 0 ? { marginLeft: 10 } : undefined}>
              {renderMyBookItem(book)}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other Books</Text>
        {otherBooks.map(book => (
          <View key={book.fileName}>
            {renderOtherBookItem(book)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  myBookItem: {
    width: myBookWidth,
    alignItems: 'center',
  },
  myBookCover: {
    width: myBookWidth - 20,
    height: (myBookWidth - 20) * 1.5,
    borderRadius: 8,
    marginBottom: 5,
  },
  myBookPlaceholder: {
    width: myBookWidth - 20,
    height: (myBookWidth - 20) * 1.5,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 5,
  },
  myBookTitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  otherBookItem: {
    flexDirection: 'row',
    height: otherBookHeight,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  otherBookCover: {
    width: otherBookHeight - 20,
    height: otherBookHeight - 20,
    borderRadius: 4,
  },
  otherBookPlaceholder: {
    width: otherBookHeight - 20,
    height: otherBookHeight - 20,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  otherBookInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  otherBookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  otherBookType: {
    fontSize: 14,
    color: '#666',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#888',
  },
});

export default BookScreen;