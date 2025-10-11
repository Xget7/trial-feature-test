import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { AtoAssistantIcon } from './AtoAssistantIcon'

interface AtoAssistantSheetProps {
  visible: boolean
  onClose: () => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export const AtoAssistantSheet: React.FC<AtoAssistantSheetProps> = ({ visible, onClose }) => {
  const [inputText, setInputText] = useState('')

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          <View style={styles.content}>
            <Text style={styles.greeting}>Soy Ato, ¿hablamos de Clara?</Text>

            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#00D4FF', '#0099FF', '#0066FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCircle}
              >
                <AtoAssistantIcon width={80} height={80} color="rgba(255, 255, 255, 0.3)" />
              </LinearGradient>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="También podés escribirme..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.indicatorBar} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.6,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: 34, // Account for safe area on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1F2937',
    textAlign: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  indicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    marginTop: 'auto',
    marginBottom: 8,
  },
})
