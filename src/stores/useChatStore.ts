import { create } from "zustand";
import { callTogetherAI } from "@/utils/TogetherAI";
import { getStockData } from "@/utils/stockData";
import { LocaleTypes } from "@/utils/localization/settings";

// 주식 정보를 저장하는 인터페이스
interface StockInfo {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  percentChange: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  accumulatedTradingVolume: number;
  accumulatedTradingValue: number;
  integrationData: any | null;
  exchangeRate: any | null;
  priceChartData: any | null;
}

// 채팅 메시지 구조를 정의하는 인터페이스
interface ChatMessage {
  role: string;
  content: string;
  stockInfo?: StockInfo;
  translationParams?: Record<string, string | number>;
}

// 채팅 스토어의 상태와 액션을 정의하는 인터페이스
interface ChatStore {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  currentStock: string | null;
  stockData: any | null;
  language: LocaleTypes;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (
    content: string,
    stockInfo?: StockInfo,
    translationParams?: Record<string, string | number>,
  ) => void;
  sendMessage: (content: string) => Promise<void>;
  fetchStockData: () => Promise<void>;
  clearChat: () => void;
  setLanguage: (lang: LocaleTypes) => void;
}

// 주식 정보를 요약하는 함수
function summarizeStockInfo(stockInfo: StockInfo): string {
  // 숫자 타입 체크 및 변환 함수
  const toFixed = (value: any, digits: number) => {
    return typeof value === 'number' ? value.toFixed(digits) : 'N/A';
  };

  return `${stockInfo.symbol} 주식 정보:
현재 가격: $${toFixed(stockInfo.currentPrice, 2)}
변동: $${toFixed(stockInfo.priceChange, 2)} (${toFixed(stockInfo.percentChange, 2)}%)
거래량: ${stockInfo.accumulatedTradingVolume.toLocaleString()}
거래대금: $${toFixed(stockInfo.accumulatedTradingValue / 1000000, 2)}M`;
}

// Zustand를 사용하여 채팅 스토어 생성
const useChatStore = create<ChatStore>((set, get) => ({
  chatHistory: [],
  isLoading: false,
  currentStock: null,
  stockData: null,
  language: "ko",

  // 새 메시지를 채팅 기록에 추가하는 함수
  addMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),

  // 마지막 메시지를 업데이트하는 함수
  updateLastMessage: (content, stockInfo, translationParams) =>
    set((state) => ({
      chatHistory: state.chatHistory.map((msg, index) =>
        index === state.chatHistory.length - 1
          ? { ...msg, content, stockInfo, translationParams }
          : msg,
      ),
    })),

  // 메시지를 보내고 응답을 처리하는 함수
  sendMessage: async (content) => {
    set({ isLoading: true });
    const userMessage = { role: "user", content };
    get().addMessage(userMessage);

    const { language } = get();
    get().addMessage({ role: "assistant", content: "generatingResponse" });

    try {
      // 주식 심볼 패턴 매칭 (1-5자리의 알파벳 또는 숫자)
      const stockSymbolMatch = content.match(/^[A-Za-z0-9]{1,5}$/);
      if (stockSymbolMatch) {
        const stockSymbol = stockSymbolMatch[0].toUpperCase();
        set({ currentStock: stockSymbol });

        const stockData = await getStockData(stockSymbol);

        if (stockData) {
          // 데이터 타입 변환 및 유효성 검사
          const stockInfoData: StockInfo = {
            symbol: stockSymbol,
            currentPrice: Number(stockData.closePrice) || 0,
            priceChange: Number(stockData.compareToPreviousClosePrice) || 0,
            percentChange: Number(stockData.fluctuationsRatio) || 0,
            openPrice: Number(stockData.openPrice) || 0,
            highPrice: Number(stockData.highPrice) || 0,
            lowPrice: Number(stockData.lowPrice) || 0,
            accumulatedTradingVolume: Number(stockData.accumulatedTradingVolume) || 0,
            accumulatedTradingValue: Number(stockData.accumulatedTradingValue) || 0,
            integrationData: stockData.integrationData,
            exchangeRate: stockData.exchangeRate,
            priceChartData: stockData.priceChartData,
          };

          const summary = summarizeStockInfo(stockInfoData);
          const aiResponse = await callTogetherAI(
            [...get().chatHistory.slice(0, -1), { role: "user", content }],
            stockSymbol,
            language
          );

          get().updateLastMessage(aiResponse, stockInfoData, {
            symbol: stockSymbol,
            summary,
          });
        } else {
          get().updateLastMessage("주식 정보를 찾을 수 없습니다.", undefined, {
            symbol: stockSymbol,
          });
        }
      } else {
        const { currentStock } = get();
        const aiResponse = await callTogetherAI(
          [...get().chatHistory.slice(0, -1), userMessage],
          currentStock ?? undefined,
          language
        );
        get().updateLastMessage(aiResponse);
      }
    } catch (error: unknown) {
      console.error("메시지 처리 중 오류 발생:", error);
      get().updateLastMessage("주식 정보를 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      set({ isLoading: false });
    }
  },

  // 주식 데이터를 가져오는 함수
  fetchStockData: async () => {
    const { currentStock } = get();
    if (currentStock) {
      try {
        const data = await getStockData(currentStock);
        set({ stockData: data });
      } catch (error: unknown) {
        console.error("주식 데이터 fetch 실패:", error);
        set({ stockData: null });
        get().updateLastMessage("주식 데이터 조회에 실패했습니다.");
      }
    }
  },

  // 채팅을 초기화하는 함수
  clearChat: () =>
    set({
      chatHistory: [],
      currentStock: null,
      stockData: null,
      language: "ko",
    }),

  // 언어를 설정하는 함수
  setLanguage: (lang: LocaleTypes) => set({ language: lang }),
}));

export default useChatStore;