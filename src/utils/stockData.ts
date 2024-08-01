import {
  calcPriceApi,
  integrationApi,
  realtimeApi,
} from "@/services/report/stockApi";
import { stockPriceApi } from "@/services/report/stockPriceApi";

interface CacheItem {
  data: any;
  timestamp: number;
}

const cache: { [key: string]: CacheItem } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5분

async function getCachedData(key: string, fetchFunction: () => Promise<any>) {
  const now = Date.now();
  if (cache[key] && now - cache[key].timestamp < CACHE_TTL) {
    return cache[key].data;
  }

  try {
    const data = await fetchFunction();
    cache[key] = { data, timestamp: now };
    return data;
  } catch (error) {
    if (cache[key]) {
      console.warn(`최신 데이터 조회 실패. 캐시된 데이터 사용: ${key}`);
      return cache[key].data;
    }
    throw error;
  }
}

export async function getStockData(symbol: string) {
  try {
    console.log(`Fetching stock data for symbol: ${symbol}`);
    const realtimeData = await getCachedData(`realtime_${symbol}`, () =>
      realtimeApi(symbol)
    );

    if (!realtimeData || !realtimeData.symbolCode || !realtimeData.stockExchangeType) {
      throw new Error(`실시간 데이터 가져오기 실패: ${symbol}`);
    }

    const integrationData = await getCachedData(`integration_${symbol}`, () =>
      integrationApi(symbol)
    );

    const exchangeRate = await getCachedData("exchange_rate", calcPriceApi);

    const priceChartData = await getCachedData(`price_chart_${symbol}`, () =>
      stockPriceApi({
        code: realtimeData.symbolCode,
        stockExchangeType: realtimeData.stockExchangeType,
      })
    );

    return {
      ...realtimeData,
      integrationData: integrationData || null,
      exchangeRate: exchangeRate || null,
      priceChartData: priceChartData || null,
    };
  } catch (error: unknown) {
    console.error("주식 데이터 fetch 중 오류 발생:", error);
    if (error instanceof Error) {
      throw new Error(`주식 데이터 조회 실패 (${symbol}): ${error.message}`);
    } else {
      throw new Error(`주식 데이터 조회 실패 (${symbol}): 알 수 없는 오류`);
    }
  }
}