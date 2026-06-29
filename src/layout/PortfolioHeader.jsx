import React, { useState } from "react";

const PortfolioHeader = ({
  tabs = [],
  activeTab,
  setActiveTab,
  gasUrl = "",
  saveGasUrl = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(gasUrl);

  const handleSave = () => {
    saveGasUrl(tempUrl);
    setIsOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">
            📊 노후자금 시스템
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            배당 · 세금 · 건강보험료 · 은퇴 현금흐름 관리
          </p>
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-lg"
          >
            ⚙️
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">
              API 주소 설정
            </h2>

            <label className="block text-sm text-slate-400 mb-2">
              Google Apps Script Web App URL
            </label>

            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-emerald-500"
            />

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                취소
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PortfolioHeader;