// src/api/sheets.js

const URL_KEY = "ttokjae_gas_url_v6";
const CACHE_KEY = "ttokjae_local_cache";

// ① API 주소 저장
export const saveApiUrl = (url) => {
  if (url && url.includes("script.google.com")) {
    localStorage.setItem(URL_KEY, url.trim());
    return true;
  }
  return false;
};

// ② API 주소 불러오기
export const getApiUrl = () => {
  const url = localStorage.getItem(URL_KEY);
  if (!url) {
    console.warn("⚠️ GAS URL이 아직 저장되지 않았습니다. 설정에서 API 주소를 입력하세요.");
    return null;
  }
  return url;
};

// ③ 구글 시트 데이터 패치
export const fetchSheetData = async () => {
  const url = getApiUrl();

  if (!url) {
    return {
      assets: [],
      snapshots: [],
      historyDb: [],
    };
  }

  try {
    const response = await fetch(url, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`네트워크 오류: ${response.status}`);
    }

    const raw = await response.json();

    console.log("✅ GAS 원본 데이터:", raw);
console.log("✅ assets 첫 번째 JSON:", JSON.stringify(raw.assets?.[0], null, 2));
console.log("✅ history 첫 번째 JSON:", JSON.stringify(raw.historyDb?.[0], null, 2));
console.log("✅ GAS 원본 키:", Object.keys(raw || {}));

console.log("✅ assets 후보:", raw?.assets || raw?.asset || raw?.현재자산 || raw?.portfolio);
console.log("✅ snapshots 후보:", raw?.snapshots || raw?.snapshot || raw?.월별결산);
console.log("✅ history 후보:", raw?.historyDb || raw?.history || raw?.종목역사 || raw?.priceHistory);

const normalizedData = normalizeSheetData(raw);

console.log("✅ 정규화 결과:", normalizedData);
console.log("✅ assets 개수:", normalizedData.assets?.length);
console.log("✅ snapshots 개수:", normalizedData.snapshots?.length);
console.log("✅ historyDb 개수:", normalizedData.historyDb?.length);
console.log("✅ assets 첫 번째 JSON:", JSON.stringify(raw.assets?.[0], null, 2));
console.log("✅ history 첫 번째 JSON:", JSON.stringify(raw.historyDb?.[0], null, 2));
localStorage.setItem(CACHE_KEY, JSON.stringify(normalizedData));

return normalizedData;
  } catch (error) {
    console.error("🚨 데이터 연동 실패, 캐시 데이터 사용:", error);

    const cachedData = localStorage.getItem(CACHE_KEY);

    return cachedData
      ? JSON.parse(cachedData)
      : {
          assets: [],
          snapshots: [],
          historyDb: [],
        };
  }
};

// ④ 데이터 구조 정규화
export const normalizeSheetData = (raw) => {
  if (!raw) {
    return {
      assets: [],
      snapshots: [],
      historyDb: [],
    };
  }

  const safeNum = (value) => {
    const num = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(num) ? num : 0;
  };

  // GAS가 배열만 주는 경우
  if (Array.isArray(raw)) {
    return {
      assets: raw,
      snapshots: [],
      historyDb: [],
    };
  }

  const rawAssets =
    raw.assets ||
    raw.asset ||
    raw.현재자산 ||
    raw.portfolio ||
    [];

  const snapshots =
    raw.snapshots ||
    raw.snapshot ||
    raw.월별결산 ||
    [];

  const historyDb =
    raw.historyDb ||
    raw.history ||
    raw.종목역사 ||
    raw.priceHistory ||
    [];

  // ticker별 최신 history 찾기
  const latestHistoryByTicker = {};

  historyDb.forEach((item) => {
    const ticker = String(item.ticker || item.종목코드 || item.code || "");
    if (!ticker) return;

    const currentDate = new Date(item.date || item.날짜);
    const prevDate = latestHistoryByTicker[ticker]
      ? new Date(latestHistoryByTicker[ticker].date || latestHistoryByTicker[ticker].날짜)
      : null;

    if (!latestHistoryByTicker[ticker] || currentDate > prevDate) {
      latestHistoryByTicker[ticker] = item;
    }
  });

  // assets를 앱 표준 구조로 변환
  const assets = rawAssets.map((asset) => {
    const ticker = String(
      asset.ticker ||
      asset.종목코드 ||
      asset.code ||
      asset.단축코드 ||
      ""
    );

    const latestHistory = latestHistoryByTicker[ticker];

    const latestDividend = safeNum(
      asset.dps ||
      asset.주당배당금 ||
      asset.dividend ||
      latestHistory?.dividend ||
      latestHistory?.분배금 ||
      latestHistory?.배당금
    );

    const latestTaxBase = safeNum(
      asset.taxBase ||
      asset.과표 ||
      asset.과세표준 ||
      latestHistory?.taxBase ||
      latestHistory?.과표 ||
      latestHistory?.과세표준
    );

    const taxableRatio =
      latestDividend > 0
        ? latestTaxBase / latestDividend
        : safeNum(asset.taxableRatio || asset.과표비중 || 1);

    return {
      ...asset,

      account:
        asset.account ||
        asset.계좌명 ||
        asset.계좌 ||
        "일반",

      ticker,

      name:
        asset.name ||
        asset.종목명 ||
        asset.stockName ||
        ticker,

      quantity:
        safeNum(asset.quantity || asset.수량 || asset.qty),

      avgPrice:
        safeNum(asset.avgPrice || asset.평균단가 || asset.매입단가),

      currentPrice:
        safeNum(
          asset.currentPrice ||
          asset.현재가 ||
          asset.price ||
          latestHistory?.price ||
          latestHistory?.주가
        ),

      divCycle:
        asset.divCycle ||
        asset.배당주기 ||
        "월말",

      dps: latestDividend,

      annualDps: latestDividend * 12,

      taxBase: latestTaxBase,

      taxableRatio,

      targetWeight:
        asset.targetWeight ||
        asset.자산구분 ||
        asset.분류 ||
        "",
    };
  });

  return {
    assets,
    snapshots,
    historyDb,
  };
};

// ⑤ 구글 시트 데이터 전송
export const saveSheetData = async (data) => {
  const url = getApiUrl();

  if (!url) {
    return { success: false, message: "URL이 설정되지 않음" };
  }

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return { success: true };
  } catch (error) {
    console.error("데이터 저장 실패:", error);
    return { success: false, message: error.message };
  }
};