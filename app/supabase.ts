import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PortfolioItem {
  id?: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number; // 평단가
  currentPrice: number; // 현재가
}

export interface FarmData {
  gold: number;
  animals: { id: string; type: string; name: string }[];
}

// 매수 / 매도 / 수정 처리 함수 (평단가 자동 계산)
export const updatePortfolioStock = (
  currentPortfolio: PortfolioItem[],
  targetStock: { symbol: string; name: string; quantity: number; price: number },
  type: 'BUY' | 'SELL'
): PortfolioItem[] => {
  const existingIndex = currentPortfolio.findIndex((item) => item.symbol === targetStock.symbol);

  if (type === 'BUY') {
    if (existingIndex > -1) {
      // 기존 종목 존재: 평단가 및 수량 갱신
      const existing = currentPortfolio[existingIndex];
      const newQuantity = existing.quantity + targetStock.quantity;
      const newAvgPrice =
        (existing.quantity * existing.avgPrice + targetStock.quantity * targetStock.price) / newQuantity;

      const updated = [...currentPortfolio];
      updated[existingIndex] = {
        ...existing,
        quantity: newQuantity,
        avgPrice: Math.round(newAvgPrice),
        currentPrice: targetStock.price,
      };
      return updated;
    } else {
      // 신규 종목 추가
      return [
        ...currentPortfolio,
        {
          symbol: targetStock.symbol,
          name: targetStock.name,
          quantity: targetStock.quantity,
          avgPrice: targetStock.price,
          currentPrice: targetStock.price,
        },
      ];
    }
  } else {
    // 매도 (SELL)
    if (existingIndex === -1) return currentPortfolio;

    const existing = currentPortfolio[existingIndex];
    const newQuantity = existing.quantity - targetStock.quantity;

    if (newQuantity <= 0) {
      // 모두 매도 시 포트폴리오에서 제거
      return currentPortfolio.filter((item) => item.symbol !== targetStock.symbol);
    } else {
      // 일부 매도 (평단가는 유지)
      const updated = [...currentPortfolio];
      updated[existingIndex] = {
        ...existing,
        quantity: newQuantity,
      };
      return updated;
    }
  }
};