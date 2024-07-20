import ReportContainer from "@/containers/report/ReportContainer";
import {
  realtimeApi,
  integrationApi,
  calcPriceApi,
} from "@/services/report/stockApi";
import {
  stockPriceApi,
  patchStockPriceApi,
} from "@/services/report/stockPriceApi";

type TParams = {
  params: {
    locale: string;
    id: string;
  };
};

export default async function Page({ params }: TParams) {
  const { id } = params;

  const {
    reutersCode,
    stockName,
    symbolCode,
    closePrice,
    compareToPreviousClosePrice,
    fluctuationsRatio,
    stockExchangeType,
  }: any = await realtimeApi(id);

  const corporateOverview = await integrationApi(id);

  const calcPrice = await calcPriceApi();

  const stockPriceData = await stockPriceApi({
    code: reutersCode,
    stockExchangeType,
  });

  const stockPriceResult = await patchStockPriceApi(
    stockPriceData,
    id.toUpperCase(),
  );

  return (
    <>
      <ReportContainer
        reutersCode={reutersCode}
        stockName={stockName}
        symbolCode={symbolCode}
        closePrice={closePrice}
        compareToPreviousClosePrice={compareToPreviousClosePrice}
        fluctuationsRatio={fluctuationsRatio}
        stockExchangeType={stockExchangeType}
        corporateOverview={corporateOverview}
        calcPrice={calcPrice}
      />
    </>
  );
}
