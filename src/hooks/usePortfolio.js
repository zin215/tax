import { useState, useEffect, useCallback } from 'react';
import { fetchSheetData } from '../api/sheets'; // 기존 fetch 로직 유지
import { calculateTax } from '../engine/taxEngine';
import { calculateAnnualDividend } from '../engine/dividendEngine';

export const usePortfolio = (gasUrl) => {
    const [portfolioData, setPortfolioData] = useState({
        isa: [], pension1: [], pension2: [], pension3: [], irp: [], gold: [], general: []
    });
    const [snapshots, setSnapshots] = useState([]); // 월별결산 데이터 추가
    const [historyDb, setHistoryDb] = useState([]); // 종목역사(주가+배당) DB 추가
    const [isLoading, setIsLoading] = useState(false);

    const loadData = useCallback(async () => {
        if (!gasUrl) return;
        setIsLoading(true);
        try {
            // 🌟 핵심 수정 포인트: AI가 제안한 대로 URL에 action 파라미터를 추가하여 명학하게 요청합니다.
            const requestUrl = gasUrl.includes('?') ? `${gasUrl}&action=load` : `${gasUrl}?action=load`;
            
            // 1. GAS에서 새로운 3탭 통합 데이터를 한 번에 가져옴
            const response = await fetch(requestUrl);
            const data = await response.json(); 
            
            // 🌟 디버깅용: 데이터가 정상적으로 들어왔는지 개발자 도구(F12) 콘솔에서 확인 가능합니다.
            console.log("✅ 시트 데이터 로드 성공:", data); 
            
            const rawAssets = data.assets || []; // 현재자산 탭
            setSnapshots(data.snapshots || []);  // 월별결산 탭
            setHistoryDb(data.historyDb || []);  // 종목역사 탭

            const grouped = {
                isa: [], pension1: [], pension2: [], pension3: [], irp: [], gold: [], general: []
            };

           // 2. 자산별 데이터 가공 및 계좌 분류 로직
            rawAssets.forEach(item => {
                // 🔥 수정 전:
                // const dps = item.dps || item.dividendAmount || 0;
                // const annualDiv = calculateAnnualDividend(item.quantity, dps, item.dividendMonth || item.divCycle);
                
                // 🚀 수정 후 (아래 세 줄로 교체하세요):
                const dps = Number(item.dps || item.dividendAmount) || 0;
                // cycle이 비어있거나 숫자여도 무조건 문자열(String)로 강제 변환하여 에러 원천 차단!
                const safeCycle = String(item.divCycle || item.dividendMonth || '').trim(); 
                const annualDiv = calculateAnnualDividend(item.quantity, dps, safeCycle);

                const ratio = item.taxableRatio !== undefined ? Number(item.taxableRatio) : 1;
                const taxInfo = calculateTax(annualDiv, item.account, item.category, ratio);

                const enrichedItem = {
                    ...item,
                    annualDividend: annualDiv,
                    taxAmount: taxInfo.taxAmount,
                    afterTaxDividend: taxInfo.afterTaxDividend
                };

                const acc = String(item.account).trim().toUpperCase();
                if (acc.includes('ISA')) grouped.isa.push(enrichedItem);
                else if (acc.includes('연금1')) grouped.pension1.push(enrichedItem);
                else if (acc.includes('연금2')) grouped.pension2.push(enrichedItem);
                else if (acc.includes('연금3')) grouped.pension3.push(enrichedItem);
                else if (acc.includes('IRP')) grouped.irp.push(enrichedItem);
                else if (acc.includes('금현물')) grouped.gold.push(enrichedItem);
                else grouped.general.push(enrichedItem);
            });

            setPortfolioData(grouped);
        } catch (error) {
            console.error("❌ 데이터 로딩 실패:", error);
        } finally {
            setIsLoading(false);
        }
    }, [gasUrl]);

    useEffect(() => {
        if (gasUrl) loadData();
    }, [gasUrl, loadData]);

    return { portfolioData, snapshots, historyDb, isLoading, reloadData: loadData };
};