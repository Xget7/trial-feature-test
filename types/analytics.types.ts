export interface TimingMetric {
  startTime: number
  endTime?: number
  duration?: number
}

export interface PerformanceAnalytics {
  sessionId: string
  timestamp: number
  stages: {
    voiceRecognition: TimingMetric
    claudeProcessing: TimingMetric
    ttsGeneration: TimingMetric
    totalEndToEnd: TimingMetric
  }
  metadata: {
    transcriptLength: number
    responseLength: number
    ttsProvider?: string
    toolsUsed?: string[]
    hadError: boolean
  }
}