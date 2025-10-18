import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { Reminder } from '../lib/atoApi'
import { useI18n } from './I18nProvider'

interface CreateReminderModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (reminder: Partial<Reminder>) => void
  userName: string
}

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({
  visible,
  onClose,
  onSubmit,
  userName,
}) => {
  const { t } = useI18n()
  const [task, setTask] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly'>('once')

  const handleSubmit = () => {
    if (!task.trim()) {
      Alert.alert(t('common.error'), t('reminders.create.errors.taskRequired'))
      return
    }

    if (!selectedDate || !selectedTime) {
      Alert.alert(t('common.error'), t('reminders.create.errors.dateTimeRequired'))
      return
    }

    const scheduledFor = `${selectedDate}T${selectedTime}:00`

    let rrule = ''
    switch (frequency) {
      case 'daily':
        rrule = 'FREQ=DAILY;INTERVAL=1'
        break
      case 'weekly':
        rrule = 'FREQ=WEEKLY;INTERVAL=1'
        break
      case 'once':
      default:
        rrule = ''
        break
    }

    const reminderData: Partial<Reminder> = {
      task: task.trim(),
      scheduled_for: scheduledFor,
      rrule,
      status: 'PENDING',
    }

    onSubmit(reminderData)

    // Reset form
    setTask('')
    setSelectedDate('')
    setSelectedTime('')
    setFrequency('once')
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getCurrentTime = () => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  const frequencyOptions = [
    { value: 'once', label: t('reminders.create.frequencies.once') },
    { value: 'daily', label: t('reminders.create.frequencies.daily') },
    { value: 'weekly', label: t('reminders.create.frequencies.weekly') },
  ]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>{t('reminders.create.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('reminders.create.title')}</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>{t('reminders.create.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('reminders.create.forLabel')} {userName}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('reminders.create.taskLabel')}</Text>
            <TextInput
              style={styles.textInput}
              value={task}
              onChangeText={setTask}
              placeholder={t('reminders.create.taskPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('reminders.create.dateLabel')}</Text>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder={getTodayDate()}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helpText}>{t('reminders.create.dateFormat')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('reminders.create.timeLabel')}</Text>
            <TextInput
              style={styles.timeInput}
              value={selectedTime}
              onChangeText={setSelectedTime}
              placeholder={getCurrentTime()}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helpText}>{t('reminders.create.timeFormat')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('reminders.create.frequencyLabel')}</Text>
            <View style={styles.frequencyContainer}>
              {frequencyOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    frequency === option.value && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setFrequency(option.value as any)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === option.value && styles.frequencyTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  frequencyTextSelected: {
    color: '#FFFFFF',
  },
})
