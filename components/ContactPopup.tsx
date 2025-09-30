import React from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useI18n } from './I18nProvider'

interface ContactPopupProps {
  visible: boolean
  onClose: () => void
}

export default function ContactPopup({ visible, onClose }: ContactPopupProps) {
  const { t } = useI18n()
  const handleWhatsApp = () => {
    const phoneNumber = '+5491133940387'
    const message = t('createAccount.whatsappMessage')
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url)
        } else {
          Alert.alert(t('common.error'), t('createAccount.whatsappNotInstalled'))
        }
      })
      .catch(() => {
        Alert.alert(t('common.error'), t('createAccount.whatsappError'))
      })

    onClose()
  }

  const handleSMS = () => {
    const phoneNumber = '+15105423814'
    const message = t('createAccount.smsMessage')
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`

    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('createAccount.smsError'))
    })

    onClose()
  }

  const handleEmail = () => {
    const email = 'hello@heyato.ai'
    const subject = t('createAccount.emailSubject')
    const body = t('createAccount.emailBody')
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('createAccount.emailError'))
    })

    onClose()
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>{t('createAccount.title')}</Text>
          <Text style={styles.subtitle}>{t('createAccount.subtitle')}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#3CCEF5" />
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={handleSMS}>
              <Ionicons name="chatbubble" size={18} color="#3CCEF5" />
              <Text style={styles.buttonText}>SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <Ionicons name="mail" size={18} color="#3CCEF5" />
              <Text style={styles.buttonText}>Email</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3CCEF5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
})
