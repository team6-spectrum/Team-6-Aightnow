import { LocaleTypes } from "./localization/settings";
import { getStockData } from "./stockData";

interface ApiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callTogetherAI(
  messages: { role: string; content: string }[],
  stockSymbol?: string,
  language: LocaleTypes = "ko",
): Promise<string> {
  let stockContext = "";
  if (stockSymbol) {
    try {
      const stockData = await getStockData(stockSymbol);
      stockContext = `현재 ${stockSymbol.toUpperCase()} 주식 데이터: ${JSON.stringify(
        stockData,
        null,
        2,
      )}`;
    } catch (error) {
      console.error("주식 데이터 가져오기 실패:", error);
      stockContext = "주식 데이터를 가져오는데 실패했습니다.";
    }
  }

  const systemPrompt = {
    role: "system",
    content: `당신은 나우챗봇입니다. 주식 시장 분석을 전문으로 하는 금융 어시스턴트입니다.
    항상 친절하고 간결하게 한국어로 응답하세요.
    인사에는 '안녕하세요! 저는 나우챗봇입니다. 궁금하신 주식이 있다면 언제든지 물어봐주세요.🤗'라고 대답하세요.
    주식 관련 질문에는 4줄 이하로 간략하게 현재 가격, 변동, 거래량을 말하고 해당 주식을 설명하세요.
    주식 데이터가 없는 경우에는 일반적인 금융 조언을 제공하세요.
    ${stockContext}`,
  };
  

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [systemPrompt, ...messages] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 응답 오류: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data: ApiResponse = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("API 응답 구조가 예상과 다릅니다.");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Together.ai API 호출 중 오류 발생:", error);
    
    // 오류 유형에 따라 다른 메시지를 반환
    if (error instanceof TypeError) {
      return language === "ko"
        ? "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요."
        : "A network error occurred. Please check your internet connection.";
    }
    
    return language === "ko"
      ? `죄송합니다. 응답을 생성하는 중 오류가 발생했습니다: ${(error as Error).message}`
      : `Sorry, an error occurred while generating the response: ${(error as Error).message}`;
  }
}