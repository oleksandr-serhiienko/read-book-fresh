import { MinusCircle, PlusCircle, Type } from "lucide-react-native";
import { useRef, useState } from "react";
import { Animated, TouchableOpacity, View, StyleSheet, Text } from "react-native";

const FontControls = ({ 
    increaseFontSize, 
    decreaseFontSize, 
    currentFontSize 
  }: { 
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    currentFontSize: number;
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;
  
    const toggleControls = () => {
      if (isVisible) {
        // Hide controls
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setIsVisible(false));
      } else {
        // Show controls
        setIsVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
  
    return (
      <View style={styles.fontControlsContainer}>
        {/* Toggle button */}
        <TouchableOpacity 
          onPress={toggleControls} 
          style={styles.toggleButton}
        >
          <Type size={24} color="#666" />
        </TouchableOpacity>
  
        {/* Controls panel */}
        {isVisible && (
          <Animated.View 
            style={[
              styles.controlsPanel,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity onPress={decreaseFontSize} style={styles.fontButton}>
              <MinusCircle size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.fontSizeDisplay}>
              <Text style={styles.fontSizeText}>{currentFontSize}</Text>
            </View>
            <TouchableOpacity onPress={increaseFontSize} style={styles.fontButton}>
              <PlusCircle size={24} color="#666" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    );
  };
  const styles = StyleSheet.create({
    toggleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fontControlsContainer: {
      position: 'absolute',
      right: 16,
      top: 16,
      zIndex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    controlsPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        marginRight: 8,
        padding: 4,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      fontButton: {
        padding: 8,
        marginHorizontal: 4,
      },
      fontSizeDisplay: {
        minWidth: 30,
        alignItems: 'center',
        justifyContent: 'center',
      },
      fontSizeText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
      }
    })
    export default FontControls;