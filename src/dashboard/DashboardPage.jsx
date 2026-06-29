import React, { useMemo } from "react";

const fmt = (num) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(Number(num) || 0));

const pct = (num, digits = 1) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(digits);
};

const safeNum = (value) => {
  const num = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const DashboardPage = ({
  assets = [],
  historyDb = [],
  targetMonthly = 4000000,
}) => {
  const dashboardData = useMemo(() => {
    const latestByTicker = {};

    historyDb.forEach((h) => {
      const ticker = String(h.ticker || h.종목코드 || h.code || "");
      if (!ticker) return;

      const currentDate = new Date(h.date || h.날짜);
      const prev = latestByTicker[ticker];
      const prevDate = prev ? new Date(prev.date || prev.날짜) : null;

      if (!prev || currentDate > prevDate) {
        latestByTicker[ticker] = h;
      }
    });

    const rows = assets.map((asset) => {
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

    const totalGrossDividend = rows.reduce(
      (sum, row) => sum + row.monthlyGrossDividend,
      0
    );

    const totalTax = rows.reduce((sum, row) => sum + row.monthlyTax, 0);

    const totalNetDividend = rows.reduce(
      (sum, row) => sum + row.monthlyNetDividend,
      0
    );

    const achievementRate =
      targetMonthly > 0 ? (totalNetDividend / targetMonthly) * 100 : 0;

    const topDividendRows = [...rows]
      .sort((a, b) => b.monthlyNetDividend - a.monthlyNetDividend)
      .slice(0, 5);

    const highTaxRiskRows = [...rows]
      .filter((row) => row.taxableRatio >= 50)
      .sort((a, b) => b.taxableRatio - a.taxableRatio);

    const accountMap = {};

    rows.forEach((row) => {
      const account = row.account || "일반";

      if (!accountMap[account]) {
        accountMap[account] = {
          account,
          marketValue: 0,
          monthlyNetDividend: 0,
          monthlyGrossDividend: 0,
          monthlyTax: 0,
          assetCount: 0,
        };
      }

      accountMap[account].marketValue += row.marketValue;
      accountMap[account].monthlyNetDividend += row.monthlyNetDividend;
      accountMap[account].monthlyGrossDividend += row.monthlyGrossDividend;
      accountMap[account].monthlyTax += row.monthlyTax;
      accountMap[account].assetCount += 1;
    });

    const accountRows = Object.values(accountMap)
      .map((row) => ({
        ...row,
        assetWeight: totalValue > 0 ? (row.marketValue / totalValue) * 100 : 0,
        dividendWeight:
          totalNetDividend > 0
            ? (row.monthlyNetDividend / totalNetDividend) * 100
            : 0,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);

    return {
      rows,
      totalValue,
      totalGrossDividend,
      totalTax,
      totalNetDividend,
      annualNetDividend: totalNetDividend * 12,
      achievementRate,
      assetCount: rows.length,
      topDividendRows,
      highTaxRiskRows,
      accountRows,
    };
  }, [assets, historyDb, targetMonthly]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-emerald-400">
          📊 노후자금 대시보드
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          전체 자산, 배당 현금흐름, 목표 생활비 달성률을 한눈에 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard
          title="총 평가금액"
          value={`₩${fmt(dashboardData.totalValue)}`}
          sub={`보유 종목 ${dashboardData.assetCount}개`}
          color="text-sky-400"
        />

        <DashboardCard
          title="월 세후 배당"
          value={`₩${fmt(dashboardData.totalNetDividend)}`}
          sub={`세전 ₩${fmt(dashboardData.totalGrossDividend)}`}
          color="text-emerald-400"
        />

        <DashboardCard
          title="연 세후 배당"
          value={`₩${fmt(dashboardData.annualNetDividend)}`}
          sub={`월 예상 세금 ₩${fmt(dashboardData.totalTax)}`}
          color="text-amber-300"
        />

        <DashboardCard
          title="생활비 달성률"
          value={`${pct(dashboardData.achievementRate)}%`}
          sub={`목표 월 ₩${fmt(targetMonthly)}`}
          color={
            dashboardData.achievementRate >= 100
              ? "text-emerald-400"
              : "text-rose-400"
          }
        />
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">목표 생활비 대비 월 세후 배당</span>
          <span className="text-white font-semibold">
            {pct(dashboardData.achievementRate)}%
          </span>
        </div>

        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              dashboardData.achievementRate >= 100
                ? "bg-emerald-500"
                : "bg-sky-500"
            }`}
            style={{
              width: `${Math.min(dashboardData.achievementRate, 100)}%`,
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>현재 월 세후 ₩{fmt(dashboardData.totalNetDividend)}</span>
          <span>목표 월 ₩{fmt(targetMonthly)}</span>
        </div>
      </div>

      <AccountSummaryMiniTable rows={dashboardData.accountRows} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">
            🏆 월 세후 배당 상위 종목
          </h3>

          <div className="space-y-3">
            {dashboardData.topDividendRows.map((row, index) => (
              <div
                key={row.ticker}
                className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-4"
              >
                <div>
                  <div className="text-white font-semibold">
                    {index + 1}. {row.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {row.account} · {row.ticker}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-emerald-400 font-bold">
                    ₩{fmt(row.monthlyNetDividend)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    세전 ₩{fmt(row.monthlyGrossDividend)}
                  </div>
                </div>
              </div>
            ))}

            {dashboardData.topDividendRows.length === 0 && (
              <div className="text-slate-500 text-sm">
                배당 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">
            ⚠️ 과표비중 리스크
          </h3>

          <div className="space-y-3">
            {dashboardData.highTaxRiskRows.length > 0 ? (
              dashboardData.highTaxRiskRows.map((row) => (
                <div
                  key={row.ticker}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-4"
                >
                  <div>
                    <div className="text-white font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {row.account} · {row.ticker}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-rose-400 font-bold">
                      {pct(row.taxableRatio)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      과표비중
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400 text-sm">
                과표비중 50% 이상 종목이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSummaryMiniTable = ({ rows = [] }) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-lg font-bold text-white mb-4">🏦 계좌별 요약</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2 text-left">계좌</th>
              <th className="py-2 text-right">평가금액</th>
              <th className="py-2 text-right">자산비중</th>
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
                <td className="py-3 text-left font-semibold text-white">
                  {row.account}
                </td>

                <td className="py-3 text-right text-sky-400 font-semibold">
                  ₩{fmt(row.marketValue)}
                </td>

                <td className="py-3 text-right text-slate-300">
                  {pct(row.assetWeight)}%
                </td>

                <td className="py-3 text-right text-emerald-400 font-semibold">
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

const DashboardCard = ({ title, value, sub, color = "text-white" }) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-inner">
      <div className="text-xs text-slate-400 mb-2">{title}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
};

export default DashboardPage;