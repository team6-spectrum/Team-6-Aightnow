"use server";

import { revalidatePath } from "next/cache";

type TCodes = {
  [key: string]: string;
};

// 주식 심볼과 API에서 사용하는 코드 매핑
const codes: TCodes = {
  AAPL: "AAPL.O",
  TSLA: "TSLA.O",
  AMZN: "AMZN.O",
  MSFT: "MSFT.O",
  GOOGL: "GOOGL.O",
  U: "U",
  NVDA: "NVDA.O",
};

// 주식 코드 검증 및 변환 함수
export async function getValidStockCode(code: string): Promise<string> {
  // 주식 코드를 대문자로 변환하고 공백을 제거
  const cleanCode = code.toUpperCase().trim();
  
  // codes 객체에서 매핑된 코드
  const apiCode = codes[cleanCode];

  // 매핑된 코드가 있으면 그 코드를 반환하고, 없으면 원래 코드를 반환
  if (apiCode) {
    console.log(`주식 코드 ${cleanCode}가 ${apiCode}로 변환되었습니다.`);
    return apiCode;
  }

  // 주식 코드가 1-5자리의 알파벳과 숫자로만 구성되어 있는지 확인
  if (/^[A-Z0-9]{1,5}$/.test(cleanCode)) {
    console.log(`주식 코드 ${cleanCode}가 그대로 사용됩니다.`);
    return cleanCode;
  }
  
  throw new Error(`유효하지 않은 주식 코드입니다: ${code}`);
}

export async function realtimeApi(code: string) {
  try {
    const stockCode = await getValidStockCode(code);

    // API URL을 콘솔에 출력하여 확인
    const apiUrl = `https://polling.finance.naver.com/api/realtime/worldstock/stock/${stockCode}`;
    console.log("데이터를 가져오는 URL:", apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // API 응답 로깅
    console.log("API 응답:", JSON.stringify(data, null, 2));

    if (!data.datas || data.datas.length === 0) {
      throw new Error(`주식 코드에 해당하는 데이터가 없습니다: ${stockCode}`);
    }

    const stockData = data.datas[0];

    revalidatePath('/');
    return stockData;

  } catch (error: unknown) {
    console.error("realtimeApi 오류:", error);
    if (error instanceof Error) {
      throw new Error(`주식 데이터 조회 실패 (${code}): ${error.message}`);
    } else {
      throw new Error(`주식 데이터 조회 실패 (${code}): 알 수 없는 오류`);
    }
  }
}


export async function basicApi(code: string): Promise<string> {
  try {
    const stockCode = await getValidStockCode(code);

    const response = await fetch(
      `https://api.stock.naver.com/stock/${stockCode}/basic`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();

    const stockData = {
      closePrice: data.closePrice,
      compareToPreviousClosePrice: data.compareToPreviousClosePrice,
      fluctuationsRatio: data.fluctuationsRatio,
      basePrice: data.stockItemTotalInfos[0]?.value,
      accumulatedTradingVolume: data.stockItemTotalInfos[4]?.value,
      stockItemTotalInfos: data.stockItemTotalInfos,
    };

    revalidatePath('/');
    return JSON.stringify(stockData);
  } catch (error) {
    console.error("basicApi error:", error);
    throw error;
  }
}

export async function integrationApi(code: string) {
  try {
    const stockCode = await getValidStockCode(code);

    const response = await fetch(
      `https://api.stock.naver.com/stock/${stockCode}/integration`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();
    revalidatePath('/');
    return data.corporateOverview;
  } catch (error) {
    console.error("integrationApi error:", error);
    throw error;
  }
}

export async function calcPriceApi() {
  try {
    const response = await fetch(
      `https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();

    if (!data.result || !data.result.calcPrice) {
      throw new Error("No exchange rate data returned from API");
    }

    revalidatePath('/');
    return data.result.calcPrice;
  } catch (error) {
    console.error("calcPriceApi error:", error);
    throw error;
  }
}

export async function stockLatestNewsListApi(code: string) {
  try {
    const stockCode = await getValidStockCode(code);

    const response = await fetch(
      `https://api.stock.naver.com/news/worldStock/${stockCode}?pageSize=3&page=1`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid news data returned from API");
    }

    const aidData = data.map((item: any) => item.aid);

    revalidatePath('/');
    return aidData;
  } catch (error) {
    console.error("stockLatestNewsListApi error:", error);
    throw error;
  }
}

export async function stockLatestNewsContentApi(
  code: string,
  aids: string[],
): Promise<string> {
  try {
    const stockCode = await getValidStockCode(code);

    const fetchPromises = aids.map(async (aid) => {
      const response = await fetch(
        `https://api.stock.naver.com/news/worldNews/stock/fnGuide/${aid}?reutersCode=${stockCode}`,
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    });

    const news = await Promise.all(fetchPromises);

    const result = news.map((item) => {
      let date = item.article.dt;

      let htmlString = item.article.content;

      let textContent = htmlString
        .replace(/<\/?[^>]+>/g, "")
        .replace(/\n+/g, " ")
        .replace(/&amp;/g, "&")
        .trim();

      return { [date]: textContent };
    });

    revalidatePath('/');
    return JSON.stringify(result);
  } catch (error) {
    console.error("stockLatestNewsContentApi error:", error);
    throw error;
  }
}