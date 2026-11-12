import { supabase } from '../supabase/client';

export interface DailyReportInput {
  reportDate: string; // YYYY-MM-DD
  symbol: string;
  timeframe: string;
  status: 'OPTIMIZED' | 'MAINTAINED' | 'REJECTED';
  previousStrategyId?: string;
  newStrategyId?: string;
  volatilityRegime: string;
  improvementMetrics: Record<string, any>;
  reportMarkdown: string;
}

export class OptReportService {
  static async saveReport(report: DailyReportInput): Promise<string> {
    const { data, error } = await supabase
      .from('opt_daily_reports')
      .insert({
        report_date: report.reportDate,
        symbol: report.symbol,
        timeframe: report.timeframe,
        status: report.status,
        previous_strategy_id: report.previousStrategyId || null,
        new_strategy_id: report.newStrategyId || null,
        volatility_regime: report.volatilityRegime,
        improvement_metrics: report.improvementMetrics,
        report_markdown: report.reportMarkdown,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async getReports(limit = 30): Promise<any[]> {
    const { data, error } = await supabase
      .from('opt_daily_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`Failed to fetch daily reports: ${error.message}`);
      return [];
    }
    return data || [];
  }
}
