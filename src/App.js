import React, { useEffect, useState } from "react";

import DashboardPage from "./dashboard/DashboardPage";
import PortfolioHeader from "./layout/PortfolioHeader";
import CashFlowSimulator from "./simulator/CashFlowSimulator";
import PortfolioManager from "./portfolio/PortfolioManager";
import CalculatorPage from "./calculator/CalculatorPage";

import { fetchSheetData, saveApiUrl, getApiUrl } from "./api/sheets";

const tabs = [
  { id: "dashboard", label: "대시보드" },
  { id: "simulator", label: "은퇴 시뮬레이터" },
  { id: "portfolio", label: "자산 관리" },
  { id: "calculator", label: "3초 계산기" },
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [gasUrl, setGasUrl] = useState(() => {
    return getApiUrl() || "";
  });

  const [sheetData, setSheetData] = useState({
    assets: [],
    snapshots: [],
    historyDb: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [targetMonthly, setTargetMonthly] = useState(() => {
    return Number(localStorage.getItem("targetMonthly") || 4000000);
  });

  const [monthlyAddition, setMonthlyAddition] = useState(() => {
    return Number(localStorage.getItem("monthlyAddition") || 1500000);
  });

  const loadSheetData = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const result = await fetchSheetData();

      console.log("정규화된 시트 데이터:", result);

      setSheetData({
        assets: result.assets || [],
        snapshots: result.snapshots || [],
        historyDb: result.historyDb || [],
      });
    } catch (error) {
      console.error(error);
      setLoadError(error.message || "데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveGasUrl = (url) => {
    const ok = saveApiUrl(url);

    if (!ok) {
      alert("올바른 Google Apps Script URL이 아닙니다.");
      return;
    }

    const savedUrl = getApiUrl() || "";
    setGasUrl(savedUrl);

    alert("API 주소가 저장되었습니다.");
  };

  useEffect(() => {
    if (gasUrl) {
      loadSheetData();
    }
  }, [gasUrl]);

  useEffect(() => {
    localStorage.setItem("targetMonthly", String(targetMonthly));
  }, [targetMonthly]);

  useEffect(() => {
    localStorage.setItem("monthlyAddition", String(monthlyAddition));
  }, [monthlyAddition]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PortfolioHeader
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gasUrl={gasUrl}
        saveGasUrl={saveGasUrl}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {isLoading && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
            데이터를 불러오는 중입니다...
          </div>
        )}

        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-300">
            {loadError}
          </div>
        )}

        {activeTab === "dashboard" && (
          <DashboardPage
            assets={sheetData.assets}
            historyDb={sheetData.historyDb}
            targetMonthly={targetMonthly}
          />
        )}

        {activeTab === "simulator" && (
          <CashFlowSimulator
            data={sheetData.assets}
            onRefresh={loadSheetData}
            targetMonthly={targetMonthly}
            setTargetMonthly={setTargetMonthly}
            monthlyAddition={monthlyAddition}
            setMonthlyAddition={setMonthlyAddition}
          />
        )}

        {activeTab === "portfolio" && (
          <PortfolioManager
            data={sheetData.assets}
            historyDb={sheetData.historyDb}
            onRefresh={loadSheetData}
          />
        )}

        {activeTab === "calculator" && <CalculatorPage />}
      </main>
    </div>
  );
}

export default App;