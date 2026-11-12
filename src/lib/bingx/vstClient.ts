import crypto from 'crypto';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface VSTOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  clientOrderID?: string;
  stopLoss?: {
    type: 'STOP_MARKET';
    stopPrice: number;
  };
  takeProfit?: {
    type: 'TAKE_PROFIT_MARKET';
    stopPrice: number;
  };
}

export interface VSTBalanceResult {
  asset: string;
  balance: number;
  equity: number;
  unrealizedProfit: number;
  availableMargin: number;
  usedMargin: number;
  isSimulated?: boolean;
}

export class BingXVSTClient {
  private static BASE_URL = 'https://open-api-vst.bingx.com';
  private static API_KEY = process.env.BINGX_API_KEY || '';
  private static API_SECRET = process.env.BINGX_API_SECRET || '';

  public static isConfigured(): boolean {
    return Boolean(this.API_KEY && this.API_SECRET && this.API_KEY.length > 5);
  }

  /**
   * Generates BingX HMAC-SHA256 signature for parameters
   */
  private static generateSignature(params: Record<string, any>, secret: string): { queryString: string; signature: string } {
    const sortedKeys = Object.keys(params).sort();
    const queryParts = sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .map((k) => `${k}=${params[k]}`);

    const queryString = queryParts.join('&');
    const signature = crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    return { queryString, signature };
  }

  /**
   * Generic authenticated API request
   */
  private static async request(endpoint: string, method: 'GET' | 'POST' | 'DELETE', params: Record<string, any> = {}): Promise<any> {
    if (!this.isConfigured()) {
      return { simulated: true, code: 0, msg: 'API Key not configured - running in local VST paper execution mode' };
    }

    const timestamp = Date.now();
    const payload = { ...params, timestamp };
    const { queryString, signature } = this.generateSignature(payload, this.API_SECRET);

    const url = `${this.BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

    const headers: Record<string, string> = {
      'X-BX-APIKEY': this.API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'AntigravityVSTExecutor/1.0',
    };

    const res = await fetch(url, {
      method,
      headers,
    });

    if (!res.ok) {
      throw new Error(`BingX VST HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return json;
  }

  /**
   * Get VST Account Balance and Equity
   */
  static async getBalance(): Promise<VSTBalanceResult> {
    if (!this.isConfigured()) {
      // Mock paper VST balance starting at 100,000 VST
      return {
        asset: 'VST',
        balance: 100000,
        equity: 100000,
        unrealizedProfit: 0,
        availableMargin: 100000,
        usedMargin: 0,
        isSimulated: true,
      };
    }

    try {
      const data = await this.request('/openApi/swap/v2/user/balance', 'GET');
      if (data.code === 0 && data.data?.balance) {
        const b = data.data.balance;
        return {
          asset: b.asset || 'VST',
          balance: parseFloat(b.balance || '0'),
          equity: parseFloat(b.equity || '0'),
          unrealizedProfit: parseFloat(b.unrealizedProfit || '0'),
          availableMargin: parseFloat(b.availableMargin || '0'),
          usedMargin: parseFloat(b.usedMargin || '0'),
          isSimulated: false,
        };
      }
    } catch (err: any) {
      console.warn(`Failed to fetch real VST balance, falling back: ${err.message}`);
    }

    return {
      asset: 'VST',
      balance: 100000,
      equity: 100000,
      unrealizedProfit: 0,
      availableMargin: 100000,
      usedMargin: 0,
      isSimulated: true,
    };
  }

  /**
   * Set leverage for perpetual futures (e.g. 20x)
   */
  static async setLeverage(symbol: string, leverage: number, side: 'LONG' | 'SHORT'): Promise<any> {
    if (!this.isConfigured()) {
      return { code: 0, simulated: true, leverage, side };
    }
    return this.request('/openApi/swap/v2/trade/leverage', 'POST', {
      symbol,
      leverage,
      side,
    });
  }

  /**
   * Place an order on BingX VST
   */
  static async placeOrder(params: VSTOrderParams): Promise<{
    orderId: string;
    symbol: string;
    status: string;
    executedPrice?: number;
    executedQty?: number;
    simulated: boolean;
  }> {
    if (!this.isConfigured()) {
      // Return simulated execution
      const mockId = `vst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        orderId: mockId,
        symbol: params.symbol,
        status: 'FILLED',
        executedPrice: params.price,
        executedQty: params.quantity,
        simulated: true,
      };
    }

    const payload: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      positionSide: params.positionSide,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.type === 'LIMIT' && params.price) {
      payload.price = params.price;
    }

    if (params.clientOrderID) {
      payload.clientOrderID = params.clientOrderID;
    }

    const res = await this.request('/openApi/swap/v2/trade/order', 'POST', payload);
    if (res.code === 0 && res.data?.order) {
      return {
        orderId: res.data.order.orderId,
        symbol: params.symbol,
        status: res.data.order.status || 'FILLED',
        executedPrice: parseFloat(res.data.order.avgPrice || res.data.order.price || '0'),
        executedQty: parseFloat(res.data.order.executedQty || params.quantity.toString()),
        simulated: false,
      };
    }

    throw new Error(`BingX VST Order Failed: code=${res.code}, msg=${res.msg}`);
  }

  /**
   * Query open positions from BingX VST
   */
  static async getOpenPositions(symbol?: string): Promise<any[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await this.request('/openApi/swap/v2/user/positions', 'GET', symbol ? { symbol } : {});
      if (res.code === 0 && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`Failed to fetch open VST positions: ${err.message}`);
    }
    return [];
  }
}
