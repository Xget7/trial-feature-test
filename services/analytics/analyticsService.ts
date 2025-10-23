import { PerformanceAnalytics } from "@/hooks/useVoiceAssistant"

interface AnalyticsAggregation {
  totalInteractions: number
  averageTimes: {
    voiceRecognition: number
    claudeProcessing: number
    ttsGeneration: number
    totalEndToEnd: number
  }
  errorRate: number
  slowestInteraction: PerformanceAnalytics | null
  fastestInteraction: PerformanceAnalytics | null
  interactions: PerformanceAnalytics[]
}

class VoiceAssistantAnalytics {
  private analytics: PerformanceAnalytics[] = []
  private maxStoredAnalytics: number = 50

  constructor(maxStoredAnalytics: number = 50) {
    this.maxStoredAnalytics = maxStoredAnalytics
  }

  /**
   * Add a new analytics entry
   */
  addAnalytics(analytics: PerformanceAnalytics): void {
    this.analytics.push(analytics)

    // Keep only the most recent entries
    if (this.analytics.length > this.maxStoredAnalytics) {
      this.analytics = this.analytics.slice(-this.maxStoredAnalytics)
    }

    console.log(`[ANALYTICS SERVICE] Stored ${this.analytics.length} interactions`)
  }

  /**
   * Get aggregated analytics
   */
  getAggregation(): AnalyticsAggregation {
    if (this.analytics.length === 0) {
      return {
        totalInteractions: 0,
        averageTimes: {
          voiceRecognition: 0,
          claudeProcessing: 0,
          ttsGeneration: 0,
          totalEndToEnd: 0,
        },
        errorRate: 0,
        slowestInteraction: null,
        fastestInteraction: null,
        interactions: [],
      }
    }

    const validAnalytics = this.analytics.filter(
      a => a.stages.totalEndToEnd.duration !== undefined
    )

    const totalInteractions = validAnalytics.length
    const errors = validAnalytics.filter(a => a.metadata.hadError).length
    const errorRate = totalInteractions > 0 ? (errors / totalInteractions) * 100 : 0

    // Calculate averages
    const sumVoiceRecognition = validAnalytics.reduce(
      (sum, a) => sum + (a.stages.voiceRecognition.duration || 0),
      0
    )
    const sumClaudeProcessing = validAnalytics.reduce(
      (sum, a) => sum + (a.stages.claudeProcessing.duration || 0),
      0
    )
    const sumTtsGeneration = validAnalytics.reduce(
      (sum, a) => sum + (a.stages.ttsGeneration.duration || 0),
      0
    )
    const sumTotalEndToEnd = validAnalytics.reduce(
      (sum, a) => sum + (a.stages.totalEndToEnd.duration || 0),
      0
    )

    const averageTimes = {
      voiceRecognition: Math.round(sumVoiceRecognition / totalInteractions),
      claudeProcessing: Math.round(sumClaudeProcessing / totalInteractions),
      ttsGeneration: Math.round(sumTtsGeneration / totalInteractions),
      totalEndToEnd: Math.round(sumTotalEndToEnd / totalInteractions),
    }

    // Find slowest and fastest
    const sortedByEndToEnd = [...validAnalytics].sort(
      (a, b) =>
        (b.stages.totalEndToEnd.duration || 0) - (a.stages.totalEndToEnd.duration || 0)
    )

    return {
      totalInteractions,
      averageTimes,
      errorRate: Math.round(errorRate * 100) / 100,
      slowestInteraction: sortedByEndToEnd[0] || null,
      fastestInteraction: sortedByEndToEnd[sortedByEndToEnd.length - 1] || null,
      interactions: validAnalytics,
    }
  }

  /**
   * Log aggregated analytics to console
   */
  logAggregation(): void {
    const agg = this.getAggregation()

    console.log('\n')
    console.log('╔═════════════════════════════════════════════════════════════════╗')
    console.log('║          VOICE ASSISTANT ANALYTICS SUMMARY                     ║')
    console.log('╠═════════════════════════════════════════════════════════════════╣')
    console.log(`║ Total Interactions: ${String(agg.totalInteractions).padEnd(44)} ║`)
    console.log(`║ Error Rate:         ${String(agg.errorRate).padEnd(44)}% ║`)
    console.log('╠═════════════════════════════════════════════════════════════════╣')
    console.log('║ AVERAGE TIMES:                                                  ║')
    console.log(
      `║   Voice Recognition: ${String(agg.averageTimes.voiceRecognition).padEnd(42)}ms ║`
    )
    console.log(
      `║   Claude Processing: ${String(agg.averageTimes.claudeProcessing).padEnd(42)}ms ║`
    )
    console.log(
      `║   TTS Generation:    ${String(agg.averageTimes.ttsGeneration).padEnd(42)}ms ║`
    )
    console.log(
      `║   Total End-to-End:  ${String(agg.averageTimes.totalEndToEnd).padEnd(42)}ms ║`
    )
    console.log('╠═════════════════════════════════════════════════════════════════╣')
    console.log('║ PERFORMANCE:                                                    ║')
    console.log(
      `║   Fastest Interaction: ${String(
        agg.fastestInteraction?.stages.totalEndToEnd.duration || 'N/A'
      ).padEnd(40)}ms ║`
    )
    console.log(
      `║   Slowest Interaction: ${String(
        agg.slowestInteraction?.stages.totalEndToEnd.duration || 'N/A'
      ).padEnd(40)}ms ║`
    )
    console.log('╚═════════════════════════════════════════════════════════════════╝')
    console.log('\n')
  }

  /**
   * Get recent analytics (last N interactions)
   */
  getRecent(count: number = 10): PerformanceAnalytics[] {
    return this.analytics.slice(-count)
  }

  /**
   * Get analytics filtered by criteria
   */
  getFiltered(filter: {
    minDuration?: number
    maxDuration?: number
    hasErrors?: boolean
    ttsProvider?: string
  }): PerformanceAnalytics[] {
    return this.analytics.filter(a => {
      if (filter.minDuration && (a.stages.totalEndToEnd.duration || 0) < filter.minDuration) {
        return false
      }
      if (filter.maxDuration && (a.stages.totalEndToEnd.duration || 0) > filter.maxDuration) {
        return false
      }
      if (filter.hasErrors !== undefined && a.metadata.hadError !== filter.hasErrors) {
        return false
      }
      if (filter.ttsProvider && a.metadata.ttsProvider !== filter.ttsProvider) {
        return false
      }
      return true
    })
  }

  /**
   * Export analytics as JSON for external services
   */
  exportJSON(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      aggregation: this.getAggregation(),
      rawData: this.analytics,
    })
  }

  /**
   * Send analytics to external service (example implementation)
   */
  async sendToAnalyticsService(endpoint: string, apiKey?: string): Promise<boolean> {
    try {
      const aggregation = this.getAggregation()

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'voice-assistant',
          aggregation,
          recentInteractions: this.getRecent(10),
        }),
      })

      if (!response.ok) {
        console.error(
          `[ANALYTICS SERVICE] Failed to send analytics: ${response.status}`
        )
        return false
      }

      console.log('[ANALYTICS SERVICE] Analytics sent successfully')
      return true
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error sending analytics:', error)
      return false
    }
  }

  /**
   * Clear all stored analytics
   */
  clear(): void {
    this.analytics = []
    console.log('[ANALYTICS SERVICE] Analytics cleared')
  }

  /**
   * Get statistics about specific stages
   */
  getStageStatistics(stage: 'voiceRecognition' | 'claudeProcessing' | 'ttsGeneration') {
    const durations = this.analytics
      .map(a => a.stages[stage].duration)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => a - b)

    if (durations.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
      }
    }

    const sum = durations.reduce((a, b) => a + b, 0)
    const average = sum / durations.length

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * durations.length) - 1
      return durations[Math.max(0, index)]
    }

    return {
      count: durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      average: Math.round(average),
      median: durations[Math.floor(durations.length / 2)],
      p95: getPercentile(95),
      p99: getPercentile(99),
    }
  }

  /**
   * Log detailed stage statistics
   */
  logStageStatistics(): void {
    console.log('\n')
    console.log('╔═════════════════════════════════════════════════════════════════╗')
    console.log('║          DETAILED STAGE STATISTICS                             ║')
    console.log('╚═════════════════════════════════════════════════════════════════╝')

    const stages: Array<'voiceRecognition' | 'claudeProcessing' | 'ttsGeneration'> = [
      'voiceRecognition',
      'claudeProcessing',
      'ttsGeneration',
    ]

    stages.forEach(stage => {
      const stats = this.getStageStatistics(stage)
      const stageName =
        stage === 'voiceRecognition'
          ? 'Voice Recognition'
          : stage === 'claudeProcessing'
          ? 'Claude Processing'
          : 'TTS Generation'

      console.log(`\n${stageName}:`)
      console.log(`  Count:   ${stats.count}`)
      console.log(`  Min:     ${stats.min}ms`)
      console.log(`  Max:     ${stats.max}ms`)
      console.log(`  Average: ${stats.average}ms`)
      console.log(`  Median:  ${stats.median}ms`)
      console.log(`  P95:     ${stats.p95}ms`)
      console.log(`  P99:     ${stats.p99}ms`)
    })

    console.log('\n')
  }
}


export const analyticsService = new VoiceAssistantAnalytics()

// Export class for custom instances
export { VoiceAssistantAnalytics }