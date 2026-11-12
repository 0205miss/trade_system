import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // 1. Fetch configs
    const { data: configs, error: configError } = await supabase
      .from('opt_cron_configs')
      .select('*');

    if (configError) {
      console.error('Failed to load opt_cron_configs:', configError);
    }

    // 2. Fetch recent logs
    const { data: logs, error: logsError } = await supabase
      .from('opt_cron_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Failed to load opt_cron_logs:', logsError);
    }

    const configMap: Record<string, string> = {};
    (configs || []).forEach((c: any) => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json({
      success: true,
      configs: configMap,
      logs: logs || [],
      jobInfo: {
        jobName: 'opt-auto-trade-vst',
        schedule: '*/1 * * * * (每 1 分鐘雲端執行)',
        engine: 'Supabase pg_cron + pg_net',
        active: configMap['is_enabled'] !== 'false',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, url, enabled } = body;

    if (action === 'trigger') {
      // Trigger Supabase pg_cron RPC manually
      const { data, error } = await supabase.rpc('opt_trigger_auto_trade');
      if (error) {
        throw new Error(`觸發 Supabase Cron 失敗: ${error.message}`);
      }
      return NextResponse.json({
        success: true,
        message: '已成功透過 Supabase 雲端排程 RPC 發送自動下單觸發請求！',
        requestId: data,
      });
    }

    if (action === 'update_url') {
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ success: false, error: '請提供有效的 Webhook URL' }, { status: 400 });
      }

      const { error } = await supabase
        .from('opt_cron_configs')
        .update({ value: url.trim(), updated_at: new Date().toISOString() })
        .eq('key', 'auto_trade_url');

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: `已成功更新 Webhook URL 為: ${url}`,
      });
    }

    if (action === 'toggle') {
      const isEnabledStr = enabled ? 'true' : 'false';
      const { error } = await supabase
        .from('opt_cron_configs')
        .update({ value: isEnabledStr, updated_at: new Date().toISOString() })
        .eq('key', 'is_enabled');

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: `已${enabled ? '啟用' : '暫停'} Supabase 雲端排程下單`,
      });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
