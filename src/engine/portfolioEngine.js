// src/engine/portfolioEngine.js

export const calculateAssetWeights = (assets) => {
    const totalValue = assets.reduce((sum, item) => sum + (item.quantity * item.currentPrice), 0);
    
    return assets.map(item => ({
        ...item,
        currentWeight: totalValue > 0 ? ((item.quantity * item.currentPrice) / totalValue) * 100 : 0
    }));
};

// 신규 투자금 투입 시 매수 가이드 계산 (목표 비중 대비)
export const getRebalanceGuidance = (assets, newInvestment, targetWeights) => {
    // 여기에 리밸런싱 알고리즘을 구현합니다.
    // 현재 비중과 목표 비중을 비교하여 차액만큼 매수 추천
};