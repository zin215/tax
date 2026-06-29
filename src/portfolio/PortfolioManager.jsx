import React, { useState, useMemo, useEffect } from "react";
import PriceDividendChart from "./PriceDividendChart";

const fmt = (num) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(Number(num) || 0));

const pct = (num, digits = 2) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(digits);
};

const safeNum = (value) => {
  const num = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const PortfolioManager = ({
  data = [],
  historyDb = [],
  onRefresh = () => {},
}) => {
  const assetsList = useMemo(() => {
    if (!data) return [];

    if (Array.isArray(data)) return data;

    if (Array.isArray(data.assets)) return data.assets;

    if (typeof data === "object") {
      return Object.values(data).filter(Array.isArray).flat();
    }

    return [];
  }, [data]);

  const historyList = useMemo(() => {
    if (!historyDb) return [];

    if (Array.isArray(historyDb)) return historyDb;

    if (typeof historyDb === "object") {
      return Object.entries(historyDb).flatMap(([key, rows]) => {
        if (!Array.isArray(rows)) return [];

        return rows.map((row) => ({
          ...row,
          ticker: row.ticker || row.종목코드 || key,
        }));
      });
    }

    return [];
  }, [historyDb]);

  const [selectedTicker, setSelectedTicker] = useState("");
  const [period, setPeriod] = useState("1Y");

  useEffect(() => {
    if (assetsList.length > 0 && !selectedTicker) {
      const first = assetsList[0];

      setSelectedTicker(
        String(
          first.ticker ||
            first.종목코드 ||
            first.code ||
            first.단축코드 ||
            first.name ||
            first.종목명 ||
            ""
        )
      );
    }
  }, [assetsList, selectedTicker]);

  const selectedAsset = useMemo(() => {
    return (
      assetsList.find((asset) => {
        const ticker = String(
          asset.ticker ||
            asset.종목코드 ||
            asset.code ||
            asset.단축코드 ||
            asset.name ||
            asset.종목명 ||
            ""
        );

        return ticker === String(selectedTicker);
      }) || null
    );
  }, [assetsList, selectedTicker]);

  const selectedHistory = useMemo(() => {
    if (!selectedTicker) return [];

    return historyList
      .filter((h) => {
        const ticker = String(
          h.ticker ||
            h.종목코드 ||
            h.code ||
            h.단축코드 ||
            h.name ||
            h.종목명 ||
            ""
        );

        return ticker === String(selectedTicker);
      })
      .sort((a, b) => new Date(a.date || a.날짜) - new Date(b.date || b.날짜))
      .map((h) => ({
        date: h.date || h.날짜,
        price: safeNum(h.price || h.주가 || h.현재가),
        dividend: safeNum(h.dividend || h.분배금 || h.배당금),
        taxBase: safeNum(h.taxBase || h.과표 || h.과세표준),
        yield: safeNum(h.yield || h.분배율),
        memo: h.memo || h.메모 || "",
      }));
  }, [selectedTicker, historyList]);

  const filteredHistory = useMemo(() => {
    if (selectedHistory.length === 0) return [];

    if (period === "ALL") return selectedHistory;

    const now = new Date();
    const cutoff = new Date();

    if (period === "3M") cutoff.setMonth(now.getMonth() - 3);
    if (period === "6M") cutoff.setMonth(now.getMonth() - 6);
    if (period === "1Y") cutoff.setFullYear(now.getFullYear() - 1);

    return selectedHistory.filter((h) => new Date(h.date) >= cutoff);
  }, [selectedHistory, period]);

const portfolioStats = useMemo(() => {
  if (!Array.isArray(assetsList) || assetsList.length === 0) {
    return {
      totalValue: 0,
      totalGrossDividend: 0,
      totalTax: 0,
      totalNetDividend: 0,
      assetCount: 0,
    };
  }

  const latestByTicker = {};

  historyList.forEach((h) => {
    const ticker = String(h.ticker || h.종목코드 || h.code || "");
    if (!ticker) return;

    const currentDate = new Date(h.date || h.날짜);
    const prev = latestByTicker[ticker];
    const prevDate = prev ? new Date(prev.date || prev.날짜) : null;

    if (!prev || currentDate > prevDate) {
      latestByTicker[ticker] = h;
    }
  });

  return assetsList.reduce(
    (acc, asset) => {
      const ticker = String(
        asset.ticker ||
          asset.종목코드 ||
          asset.code ||
          asset.단축코드 ||
          ""
      );

      const latest = latestByTicker[ticker];

      const quantity = safeNum(asset.quantity || asset.수량);
      const currentPrice = safeNum(
        asset.currentPrice || asset.현재가 || asset.price || latest?.price
      );

      const dividend = safeNum(
        asset.dps || asset.주당배당금 || asset.dividend || latest?.dividend
      );

      const taxBase = safeNum(
        asset.taxBase || asset.과표 || asset.과세표준 || latest?.taxBase
      );

      const value = quantity * currentPrice;
      const grossDividend = quantity * dividend;
      const tax = quantity * taxBase * 0.154;
      const netDividend = grossDividend - tax;

      acc.totalValue += value;
      acc.totalGrossDividend += grossDividend;
      acc.totalTax += tax;
      acc.totalNetDividend += netDividend;
      acc.assetCount += 1;

      return acc;
    },
    {
      totalValue: 0,
      totalGrossDividend: 0,
      totalTax: 0,
      totalNetDividend: 0,
      assetCount: 0,
    }
  );
}, [assetsList, historyList]);


const portfolioRows = useMemo(() => {
  if (!Array.isArray(assetsList) || assetsList.length === 0) return [];

  const latestByTicker = {};

  historyList.forEach((h) => {
    const ticker = String(h.ticker || h.종목코드 || h.code || "");
    if (!ticker) return;

    const currentDate = new Date(h.date || h.날짜);
    const prev = latestByTicker[ticker];
    const prevDate = prev ? new Date(prev.date || prev.날짜) : null;

    if (!prev || currentDate > prevDate) {
      latestByTicker[ticker] = h;
    }
  });

  const rows = assetsList.map((asset) => {
    const ticker = String(
      asset.ticker ||
        asset.종목코드 ||
        asset.code ||
        asset.단축코드 ||
        ""
    );

    const latest = latestByTicker[ticker];

    const account = asset.account || asset.계좌명 || asset.계좌 || "일반";
    const name = asset.name || asset.종목명 || asset.stockName || ticker;

    const quantity = safeNum(asset.quantity || asset.수량);
    const currentPrice = safeNum(
      asset.currentPrice || asset.현재가 || asset.price || latest?.price
    );

    const dividend = safeNum(
      asset.dps || asset.주당배당금 || asset.dividend || latest?.dividend
    );

    const taxBase = safeNum(
      asset.taxBase || asset.과표 || asset.과세표준 || latest?.taxBase
    );

    const marketValue = quantity * currentPrice;
    const monthlyGrossDividend = quantity * dividend;
    const monthlyTax = quantity * taxBase * 0.154;
    const monthlyNetDividend = monthlyGrossDividend - monthlyTax;

    const taxableRatio = dividend > 0 ? (taxBase / dividend) * 100 : 0;

    return {
      ticker,
      account,
      name,
      quantity,
      currentPrice,
      marketValue,
      monthlyGrossDividend,
      monthlyTax,
      monthlyNetDividend,
      taxableRatio,
    };
  });

  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
  const totalNetDividend = rows.reduce(
    (sum, row) => sum + row.monthlyNetDividend,
    0
  );

  return rows
    .map((row) => ({
      ...row,
      assetWeight: totalValue > 0 ? (row.marketValue / totalValue) * 100 : 0,
      dividendWeight:
        totalNetDividend > 0
          ? (row.monthlyNetDividend / totalNetDividend) * 100
          : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}, [assetsList, historyList]);

const accountRows = useMemo(() => {
  if (!Array.isArray(portfolioRows) || portfolioRows.length === 0) return [];

  const grouped = {};

  portfolioRows.forEach((row) => {
    const account = row.account || "일반";

    if (!grouped[account]) {
      grouped[account] = {
        account,
        marketValue: 0,
        monthlyGrossDividend: 0,
        monthlyTax: 0,
        monthlyNetDividend: 0,
        assetCount: 0,
      };
    }

    grouped[account].marketValue += row.marketValue || 0;
    grouped[account].monthlyGrossDividend += row.monthlyGrossDividend || 0;
    grouped[account].monthlyTax += row.monthlyTax || 0;
    grouped[account].monthlyNetDividend += row.monthlyNetDividend || 0;
    grouped[account].assetCount += 1;
  });

  const totalValue = portfolioRows.reduce(
    (sum, row) => sum + (row.marketValue || 0),
    0
  );

  const totalNetDividend = portfolioRows.reduce(
    (sum, row) => sum + (row.monthlyNetDividend || 0),
    0
  );

  return Object.values(grouped)
    .map((row) => ({
      ...row,
      assetWeight:
        totalValue > 0 ? (row.marketValue / totalValue) * 100 : 0,
      dividendWeight:
        totalNetDividend > 0
          ? (row.monthlyNetDividend / totalNetDividend) * 100
          : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}, [portfolioRows]);

  const assetStats = useMemo(() => {
    if (!selectedAsset) return null;

    const latestHistory =
      selectedHistory.length > 0
        ? selectedHistory[selectedHistory.length - 1]
        : null;

    const quantity = safeNum(selectedAsset.quantity || selectedAsset.수량);
    const avgPrice = safeNum(
      selectedAsset.avgPrice ||
        selectedAsset.평균단가 ||
        selectedAsset.매입단가
    );

    const currentPrice = safeNum(
      selectedAsset.currentPrice ||
        selectedAsset.현재가 ||
        selectedAsset.price ||
        latestHistory?.price
    );

    const dividend = safeNum(
      selectedAsset.dps ||
        selectedAsset.주당배당금 ||
        selectedAsset.dividend ||
        latestHistory?.dividend
    );

    const taxBase = safeNum(
      selectedAsset.taxBase ||
        selectedAsset.과표 ||
        selectedAsset.과세표준 ||
        latestHistory?.taxBase
    );

    const monthlyGrossDividend = quantity * dividend;
    const monthlyTax = quantity * taxBase * 0.154;
    const monthlyNetDividend = monthlyGrossDividend - monthlyTax;

    const marketValue = quantity * currentPrice;
    const investedAmount = quantity * avgPrice;
    const profitLoss = marketValue - investedAmount;
    const profitRate =
      investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

    const taxableRatio = dividend > 0 ? (taxBase / dividend) * 100 : 0;
    const latestYield = latestHistory?.yield || 0;

    return {
      quantity,
      avgPrice,
      currentPrice,
      dividend,
      taxBase,
      monthlyGrossDividend,
      monthlyTax,
      monthlyNetDividend,
      marketValue,
      investedAmount,
      profitLoss,
      profitRate,
      taxableRatio,
      latestYield,
    };
  }, [selectedAsset, selectedHistory]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-emerald-400 mb-2">
              📊 상세 종목 분석 뷰어
            </h2>
            <p className="text-sm text-slate-400">
              GAS 자산 데이터와 종목 이력을 연결해 종목별 평가금액과 배당을 분석합니다.
            </p>
          </div>

          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500 min-w-[320px]"
          >
            {assetsList.length === 0 && <option value="">자산 데이터 없음</option>}

            {assetsList.map((asset, index) => {
              const ticker = String(
                asset.ticker ||
                  asset.종목코드 ||
                  asset.code ||
                  asset.단축코드 ||
                  asset.name ||
                  asset.종목명 ||
                  `asset-${index}`
              );

              const label =
                asset.name ||
                asset.종목명 ||
                asset.stockName ||
                asset.ticker ||
                asset.종목코드 ||
                `자산 ${index + 1}`;

              const account = asset.account || asset.계좌명 || asset.계좌 || "계좌";

              return (
                <option key={`${ticker}-${index}`} value={ticker}>
                  [{account}] {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

  <KpiCard
    title="전체 평가금액"
    value={`₩${fmt(portfolioStats.totalValue)}`}
    sub={`보유 종목 ${portfolioStats.assetCount}개`}
    color="text-sky-400"
  />

  <KpiCard
    title="전체 월 세전 배당"
    value={`₩${fmt(portfolioStats.totalGrossDividend)}`}
    sub="전체 종목 합산"
    color="text-emerald-400"
  />

  <KpiCard
    title="전체 월 예상 세금"
    value={`₩${fmt(portfolioStats.totalTax)}`}
    sub="과표 × 15.4%"
    color="text-rose-400"
  />

  <KpiCard
    title="전체 월 세후 배당"
    value={`₩${fmt(portfolioStats.totalNetDividend)}`}
    sub={`연 세후 ₩${fmt(portfolioStats.totalNetDividend * 12)}`}
    color="text-amber-300"
  />
</div>

<AccountSummaryTable rows={accountRows} />

<AccountWeightCards rows={accountRows} />

<PortfolioAllocationTable
  rows={portfolioRows}
  onSelectTicker={setSelectedTicker}
/>

      {selectedAsset && assetStats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="평가금액"
              value={`₩${fmt(assetStats.marketValue)}`}
              sub={`보유수량 ${fmt(assetStats.quantity)}주`}
              color="text-sky-400"
            />

            <KpiCard
              title="평가손익"
              value={`${assetStats.profitLoss >= 0 ? "+" : "-"}₩${fmt(
                Math.abs(assetStats.profitLoss)
              )}`}
              sub={`수익률 ${pct(assetStats.profitRate)}%`}
              color={assetStats.profitLoss >= 0 ? "text-emerald-400" : "text-rose-400"}
            />

            <KpiCard
              title="월 세전 배당"
              value={`₩${fmt(assetStats.monthlyGrossDividend)}`}
              sub={`최근 주당 분배금 ${fmt(assetStats.dividend)}원`}
              color="text-emerald-400"
            />

            <KpiCard
              title="월 세후 배당"
              value={`₩${fmt(assetStats.monthlyNetDividend)}`}
              sub={`월 예상 세금 ₩${fmt(assetStats.monthlyTax)}`}
              color="text-amber-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="현재가"
              value={`₩${fmt(assetStats.currentPrice)}`}
              sub={`평균단가 ₩${fmt(assetStats.avgPrice)}`}
              color="text-white"
            />

            <KpiCard
              title="과표비중"
              value={`${pct(assetStats.taxableRatio)}%`}
              sub={`과표 ${fmt(assetStats.taxBase)}원 / 분배금 ${fmt(assetStats.dividend)}원`}
              color="text-rose-300"
            />

            <KpiCard
              title="최근 분배율"
              value={`${pct(assetStats.latestYield)}%`}
              sub="historyDb 기준 최근 값"
              color="text-indigo-300"
            />

            <KpiCard
              title="종목 코드"
              value={String(selectedTicker)}
              sub={selectedAsset.name || selectedAsset.종목명 || ""}
              color="text-slate-200"
            />
          </div>
        </>
      )}

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm text-slate-400 uppercase">
            주가 및 분배금 차트
          </h3>

          <div className="flex gap-2">
            {["3M", "6M", "1Y", "ALL"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded ${
                  period === p
                    ? "bg-sky-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-96 bg-slate-950 rounded-xl border border-slate-800/50 overflow-hidden">
          {filteredHistory.length > 0 ? (
            <PriceDividendChart
              history={filteredHistory}
              period={period}
              setPeriod={setPeriod}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600 text-sm">
              선택 종목의 이력 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm text-slate-400 uppercase mb-4">
          최근 기록 이력
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 text-left">날짜</th>
                <th className="py-2 text-right">주가</th>
                <th className="py-2 text-right">분배금</th>
                <th className="py-2 text-right">과표</th>
                <th className="py-2 text-right">과표비중</th>
                <th className="py-2 text-right">분배율</th>
                <th className="py-2 text-left">메모</th>
              </tr>
            </thead>

            <tbody>
              {selectedHistory.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-600">
                    기록 데이터가 없습니다.
                  </td>
                </tr>
              )}

              {selectedHistory
                .slice(-12)
                .reverse()
                .map((h, i) => {
                  const displayDate = formatDate(h.date);
                  const taxableRatio =
                    h.dividend > 0 ? (h.taxBase / h.dividend) * 100 : 0;

                  return (
                    <tr
                      key={i}
                      className="border-b border-slate-800/50 hover:bg-slate-800"
                    >
                      <td className="py-3 text-slate-300 font-mono">
                        {displayDate}
                      </td>
                      <td className="py-3 text-right">₩{fmt(h.price)}</td>
                      <td className="py-3 text-right text-emerald-400">
                        ₩{fmt(h.dividend)}
                      </td>
                      <td className="py-3 text-right text-amber-400">
                        ₩{fmt(h.taxBase)}
                      </td>
                      <td className="py-3 text-right text-rose-300">
                        {pct(taxableRatio)}%
                      </td>
                      <td className="py-3 text-right text-indigo-300">
                        {pct(h.yield)}%
                      </td>
                      <td className="py-3 text-left text-slate-500">
                        {h.memo || "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AccountSummaryTable = ({ rows = [] }) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            🏦 계좌별 자산 및 배당 요약
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            계좌별 평가금액, 배당, 세금, 비중을 확인합니다.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 text-left">계좌</th>
              <th className="py-2 text-right">평가금액</th>
              <th className="py-2 text-right">자산비중</th>
              <th className="py-2 text-right">월 세전 배당</th>
              <th className="py-2 text-right">월 세금</th>
              <th className="py-2 text-right">월 세후 배당</th>
              <th className="py-2 text-right">배당기여도</th>
              <th className="py-2 text-right">종목 수</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.account}
                className="border-b border-slate-800/50 hover:bg-slate-800"
              >
                <td className="py-3 text-left">
                  <div className="font-semibold text-white">
                    {row.account}
                  </div>
                </td>

                <td className="py-3 text-right text-sky-400 font-semibold">
                  ₩{fmt(row.marketValue)}
                </td>

                <td className="py-3 text-right text-slate-300">
                  {pct(row.assetWeight)}%
                </td>

                <td className="py-3 text-right text-emerald-400">
                  ₩{fmt(row.monthlyGrossDividend)}
                </td>

                <td className="py-3 text-right text-rose-400">
                  ₩{fmt(row.monthlyTax)}
                </td>

                <td className="py-3 text-right text-amber-300 font-semibold">
                  ₩{fmt(row.monthlyNetDividend)}
                </td>

                <td className="py-3 text-right text-indigo-300">
                  {pct(row.dividendWeight)}%
                </td>

                <td className="py-3 text-right text-slate-400">
                  {fmt(row.assetCount)}개
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AccountWeightCards = ({ rows = [] }) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">
          📊 계좌별 자산비중 / 배당기여도
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          계좌별 자산 집중도와 배당 현금흐름 기여도를 비교합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div
            key={row.account}
            className="bg-slate-950 border border-slate-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-bold text-white">
                  {row.account}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  보유 종목 {fmt(row.assetCount)}개
                </div>
              </div>

              <div className="text-right">
                <div className="text-sky-400 font-bold">
                  ₩{fmt(row.marketValue)}
                </div>
                <div className="text-xs text-amber-300 mt-1">
                  월 세후 ₩{fmt(row.monthlyNetDividend)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <WeightBar
                label="자산비중"
                value={row.assetWeight}
                colorClass="bg-sky-500"
              />

              <WeightBar
                label="배당기여도"
                value={row.dividendWeight}
                colorClass="bg-emerald-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeightBar = ({ label, value, colorClass }) => {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-semibold">{pct(safeValue)}%</span>
      </div>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

const PortfolioAllocationTable = ({ rows = [], onSelectTicker = () => {} }) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            🧩 종목별 비중 및 배당 기여도
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            평가금액 비중과 월 세후 배당 기여도를 비교합니다.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 text-left">종목</th>
              <th className="py-2 text-left">계좌</th>
              <th className="py-2 text-right">평가금액</th>
              <th className="py-2 text-right">자산비중</th>
              <th className="py-2 text-right">월 세전 배당</th>
              <th className="py-2 text-right">월 세후 배당</th>
              <th className="py-2 text-right">배당기여도</th>
              <th className="py-2 text-right">과표비중</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.ticker}
                onClick={() => onSelectTicker(row.ticker)}
                className="border-b border-slate-800/50 hover:bg-slate-800 cursor-pointer"
              >
                <td className="py-3 text-left">
                  <div className="font-semibold text-white">{row.name}</div>
                  <div className="text-slate-500 mt-1">{row.ticker}</div>
                </td>

                <td className="py-3 text-left text-slate-400">
                  {row.account}
                </td>

                <td className="py-3 text-right text-sky-400 font-semibold">
                  ₩{fmt(row.marketValue)}
                </td>

                <td className="py-3 text-right text-slate-300">
                  {pct(row.assetWeight)}%
                </td>

                <td className="py-3 text-right text-emerald-400">
                  ₩{fmt(row.monthlyGrossDividend)}
                </td>

                <td className="py-3 text-right text-amber-300 font-semibold">
                  ₩{fmt(row.monthlyNetDividend)}
                </td>

                <td className="py-3 text-right text-indigo-300">
                  {pct(row.dividendWeight)}%
                </td>

                <td className="py-3 text-right text-rose-300">
                  {pct(row.taxableRatio)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const KpiCard = ({ title, value, sub, color = "text-white" }) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-inner">
      <div className="text-xs text-slate-400 mb-2">{title}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

export default PortfolioManager;