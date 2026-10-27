'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, updatePortfolioStock } from './supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  buyPrice: number;
  currentPrice: number;
  quantity: number;
}

interface JournalEntry {
  date: string;
  note: string;
}

interface Animal {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

const PIE_COLORS = ['#3182F6', '#F04452', '#00C49F', '#FFBB28', '#8884D8', '#FF8042'];

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'farm' | 'portfolio' | 'league' | 'news' | 'menu'>('farm');
  
  // 테마 상태
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // 사용자 정보 및 상태
  const [userName, setUserName] = useState('투자왕');
  const [title, setTitle] = useState('나만의 농장');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  
  // 게임 요소 (골드, 동물)
  const [gold, setGold] = useState(0);
  const [myAnimals, setMyAnimals] = useState<string[]>([]);
  const [isWateredToday, setIsWateredToday] = useState(false);
  const [isHarvestedToday, setIsHarvestedToday] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  // 매매일지 및 출석
  const [journalNote, setJournalNote] = useState('');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isAttendanceDone, setIsAttendanceDone] = useState(false);

  // 신규 종목 추가 입력 폼 상태
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  // 기존 종목 수정(추가 매수 / 분할 매도) 모달 상태
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [tradePrice, setTradePrice] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('');

  // AI 분석 질문 상태
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  // 동물 상점 리스트
  const animalShop: Animal[] = [
    { id: 'chick', name: '아기 병아리', emoji: '🐣', price: 500 },
    { id: 'cow', name: '젖소', emoji: '🐮', price: 1200 },
    { id: 'pig', name: '복돼지', emoji: '🐷', price: 2000 },
    { id: 'alpaca', name: '알파카', emoji: '🦙', price: 3500 },
    { id: 'golden_cow', name: '황금 소', emoji: '🐂', price: 5000 },
  ];

  // Supabase 유저 데이터 연동
  useEffect(() => {
    fetchUserSession();
  }, []);

  const fetchUserSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      if (data.farm_data) {
        setGold(data.farm_data.gold ?? 0);
        setMyAnimals(data.farm_data.animals ? data.farm_data.animals.map((a: any) => a.type || a) : []);
      }
      if (data.portfolio_data) {
        setStocks(data.portfolio_data.map((item: any) => ({
          id: item.symbol,
          symbol: item.symbol,
          name: item.name,
          buyPrice: item.avgPrice,
          currentPrice: item.currentPrice,
          quantity: item.quantity
        })));
      }
    }
  };

  // 자산 연산
  const totalInvestment = stocks.reduce((acc, s) => acc + s.buyPrice * s.quantity, 0);
  const totalEvaluation = stocks.reduce((acc, s) => acc + s.currentPrice * s.quantity, 0);
  const totalProfit = totalEvaluation - totalInvestment;
  const profitRate = totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(2) : '0.00';

  // 상위 3개 주식 추출
  const top3Stocks = [...stocks]
    .sort((a, b) => b.currentPrice * b.quantity - a.currentPrice * a.quantity)
    .slice(0, 3);

  // 물주기
  const handleWatering = () => {
    if (isWateredToday) {
      alert('오늘 이미 물을 주었습니다!');
      return;
    }
    setIsWateredToday(true);
    alert('💧 농장에 물을 주었습니다! 작물들이 싱싱하게 자라납니다.');
  };

  // 수확하기
  const handleHarvest = () => {
    if (!isWateredToday) {
      alert('먼저 작물에 물을 주어야 수확할 수 있습니다!');
      return;
    }
    if (isHarvestedToday) {
      alert('오늘의 수확을 이미 완료했습니다!');
      return;
    }
    const earnedGold = Math.max(300, Math.floor(Number(profitRate) * 50 + 500));
    setGold((prev) => prev + earnedGold);
    setIsHarvestedToday(true);
    alert(`🎉 수확 완료! ${earnedGold} Gold를 획득했습니다.`);
  };

  // 동물 입양
  const handleBuyAnimal = (animal: Animal) => {
    if (gold < animal.price) {
      alert('골드가 부족합니다!');
      return;
    }
    setGold((prev) => prev - animal.price);
    setMyAnimals([...myAnimals, animal.emoji]);
    alert(`🎉 ${animal.name}을(를) 입양했습니다! 방목장에서 자유롭게 돌아다닙니다.`);
  };

  // 신규 종목 추가 (우측 폼)
  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !buyPrice || !quantity) return;

    const currentPortfolio = stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      quantity: s.quantity,
      avgPrice: s.buyPrice,
      currentPrice: s.currentPrice,
    }));

    const updatedPortfolio = updatePortfolioStock(
      currentPortfolio,
      {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        quantity: Number(quantity),
        price: Number(buyPrice),
      },
      'BUY'
    );

    setStocks(
      updatedPortfolio.map((item) => ({
        id: item.symbol,
        symbol: item.symbol,
        name: item.name,
        buyPrice: item.avgPrice,
        currentPrice: item.currentPrice,
        quantity: item.quantity,
      }))
    );

    alert('신규 종목이 성공적으로 추가되었습니다.');
    setSymbol('');
    setName('');
    setBuyPrice('');
    setQuantity('');
  };

  // 기존 종목 수정 (추가 매수 / 분할 매도 모달 처리)
  const handleTradeUpdate = (type: 'BUY' | 'SELL') => {
    if (!editingStock || !tradePrice || !tradeQuantity) return;

    const currentPortfolio = stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      quantity: s.quantity,
      avgPrice: s.buyPrice,
      currentPrice: s.currentPrice,
    }));

    const updatedPortfolio = updatePortfolioStock(
      currentPortfolio,
      {
        symbol: editingStock.symbol,
        name: editingStock.name,
        quantity: Number(tradeQuantity),
        price: Number(tradePrice),
      },
      type
    );

    setStocks(
      updatedPortfolio.map((item) => ({
        id: item.symbol,
        symbol: item.symbol,
        name: item.name,
        buyPrice: item.avgPrice,
        currentPrice: item.currentPrice,
        quantity: item.quantity,
      }))
    );

    alert(`${editingStock.name} 종목의 ${type === 'BUY' ? '추가 매수' : '분할 매도'}가 완료되었습니다.`);
    setEditingStock(null);
    setTradePrice('');
    setTradeQuantity('');
  };

  const deleteStock = (id: string) => {
    setStocks(stocks.filter((s) => s.id !== id));
  };

  // 매매일지 저장
  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalNote.trim()) return;

    const today = new Date().toLocaleDateString('ko-KR');
    setJournals([{ date: today, note: journalNote }, ...journals]);
    setJournalNote('');
    setIsAttendanceDone(true);
    setGold((prev) => prev + 300);
    alert('📝 매매일지가 저장되었습니다! (+300 Gold)');
  };

  // AI 질문 핸들러
  const handleAiAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiAnswer(`AI 분석 리포트: "${aiQuestion}"에 대한 질문을 분석했습니다. 현재 포트폴리오의 비중과 분산 투자 상태를 고려할 때 지속적인 위험 관리가 필요합니다.`);
  };

  // 원형 피자 차트 데이터
  const pieChartData = stocks.map((s) => ({
    name: s.name,
    value: s.currentPrice * s.quantity,
  }));

  // 테마별 스타일
  const isDark = themeMode === 'dark';
  const bgMain = isDark ? 'bg-[#101418] text-white' : 'bg-[#F2F4F6] text-[#191F28]';
  const bgCard = isDark ? 'bg-[#1B2128] border-[#28303B]' : 'bg-white border-[#E5E8EB] shadow-sm';
  const bgSubCard = isDark ? 'bg-[#101418] border-[#28303B]' : 'bg-[#F9FAFB] border-[#E5E8EB]';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <main className={`min-h-screen ${bgMain} pb-28 pt-6 px-4 md:px-8 transition-colors duration-200`}>
      <style jsx global>{`
        @keyframes walkAround {
          0% { transform: translateX(0px) scaleX(1); }
          45% { transform: translateX(110px) scaleX(1); }
          50% { transform: translateX(110px) scaleX(-1); }
          95% { transform: translateX(0px) scaleX(-1); }
          100% { transform: translateX(0px) scaleX(1); }
        }
        .animate-walk {
          animation: walkAround 8s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. 내 농장 탭 */}
        {activeTab === 'farm' && (
          <div className="space-y-6">
            
            {/* 상단 헤더 영역 */}
            <div className={`${bgCard} p-6 rounded-2xl border space-y-2 shadow-sm`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                      autoFocus
                      className={`text-lg font-extrabold px-2 py-0.5 rounded border border-[#3182F6] outline-none ${isDark ? 'bg-[#101418] text-white' : 'bg-white text-black'}`}
                    />
                  ) : (
                    <h1 onClick={() => setIsEditingTitle(true)} className="text-xl font-extrabold tracking-tight cursor-pointer hover:opacity-80 flex items-center gap-1.5">
                      {title} <span className="text-xs opacity-40">✏️</span>
                    </h1>
                  )}

                  {/* 수익률 뱃지 */}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    Number(profitRate) >= 0 
                      ? 'bg-red-500/10 text-[#F04452] border-red-500/20' 
                      : 'bg-blue-500/10 text-[#3182F6] border-blue-500/20'
                  }`}>
                    수익률 {Number(profitRate) >= 0 ? '+' : ''}{profitRate}%
                  </span>
                </div>
              </div>

              <p className={`text-xs ${textSub}`}>
                <span className="text-[#3182F6] font-bold">{userName}</span>님, 오늘도 포트폴리오를 점검해 보세요! 👋
              </p>
            </div>

            {/* 농장 칸 */}
            <div className="relative rounded-2xl border border-[#28303B] overflow-hidden bg-emerald-950/40 p-6 min-h-[340px] flex flex-col justify-between shadow-inner">
              
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-black/50 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                    🌾 내 포트폴리오 농장
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-black/50 px-3 py-1.5 rounded-full border border-amber-500/30">
                    💰 {gold.toLocaleString()} Gold
                  </span>
                </div>
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3.5 py-2 rounded-xl shadow transition-transform active:scale-95"
                >
                  🛒 동물 상점 열기
                </button>
              </div>

              <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-[180px]">
                
                {/* [왼쪽] 대표 자산 식물 밭 */}
                <div className="bg-black/30 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-400 mb-3 bg-emerald-950/80 px-2 py-0.5 rounded">
                    🌱 대표 자산 식물 밭 (TOP 3)
                  </span>

                  <div className="flex gap-5 items-end justify-center">
                    {top3Stocks.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-4">
                        포트폴리오에 주식을 추가하면<br />상위 3개 종목이 식물로 자랍니다!
                      </div>
                    ) : (
                      top3Stocks.map((stock, idx) => (
                        <div key={stock.id} className="flex flex-col items-center group cursor-pointer">
                          <div className="text-4xl mb-1 transition-transform group-hover:scale-125">
                            {isWateredToday ? (Number(profitRate) >= 0 ? '🍎' : '🌾') : '🌱'}
                          </div>
                          <div className="bg-black/70 border border-emerald-500/40 px-2 py-0.5 rounded text-center">
                            <p className="text-[11px] font-bold text-emerald-300">{stock.name}</p>
                            <p className="text-[9px] text-gray-400">TOP {idx + 1}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* [오른쪽] 동물 방목장 */}
                <div className="bg-black/30 border border-amber-500/20 p-4 rounded-xl relative min-h-[140px] flex flex-col justify-between overflow-hidden">
                  <span className="text-[10px] font-bold text-amber-400 mb-2 bg-amber-950/80 px-2 py-0.5 rounded w-fit">
                    🐾 동물 자유 방목장 ({myAnimals.length}마리)
                  </span>

                  <div className="relative h-20 w-full overflow-hidden flex items-center">
                    {myAnimals.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center w-full">
                        신규 가입 초기 상태입니다! (보유 동물 0마리)<br />상점에서 동물을 입양해 보세요.
                      </div>
                    ) : (
                      myAnimals.map((emoji, idx) => (
                        <div
                          key={idx}
                          className="absolute text-3xl animate-walk cursor-pointer hover:scale-125 transition-transform"
                          style={{
                            top: `${(idx * 20) % 40}px`,
                            animationDelay: `${idx * 1.2}s`,
                            animationDuration: `${6 + (idx % 4)}s`,
                          }}
                          onClick={() => alert(`${emoji} 동물이 기분 좋게 울어댑니다!`)}
                        >
                          {emoji}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* 액션 버튼 */}
              <div className="grid grid-cols-2 gap-3 z-10">
                <button
                  onClick={handleWatering}
                  className={`py-3 rounded-xl font-bold text-xs shadow transition-transform active:scale-95 ${
                    isWateredToday ? 'bg-blue-900/60 text-blue-300 border border-blue-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {isWateredToday ? '💧 오늘 물주기 완료' : '💧 하루 한 번 물주기'}
                </button>
                <button
                  onClick={handleHarvest}
                  className={`py-3 rounded-xl font-bold text-xs shadow transition-transform active:scale-95 ${
                    isHarvestedToday ? 'bg-gray-800 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isHarvestedToday ? '🌾 오늘 수확 완료' : '🌾 작물 수확하기 (Gold 획득)'}
                </button>
              </div>

            </div>

            {/* 매매일지 작성 폼 */}
            <div className={`${bgCard} p-6 rounded-2xl border`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold">📅 오늘의 매매일지 & 출석</h2>
                {isAttendanceDone && (
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    ✔️ 오늘 출석완료
                  </span>
                )}
              </div>
              <p className={`text-xs mb-4 ${textSub}`}>매매일지를 작성하면 출석체크와 함께 **300 Gold**가 적립됩니다.</p>

              <form onSubmit={handleJournalSubmit} className="space-y-3">
                <textarea
                  rows={2}
                  placeholder="오늘의 매수/매도 이유나 투자 메모를 남겨보세요."
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                />
                <button type="submit" className="w-full bg-[#3182F6] py-3 rounded-xl font-bold text-sm text-white hover:bg-[#2b72d9]">
                  오늘 출석체크 & 300 Gold 받기
                </button>
              </form>
            </div>

          </div>
        )}

        {/* 2. 포트폴리오 탭 */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* 투자원금 및 총평가금액 카드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${bgCard} p-5 rounded-2xl border`}>
                  <p className={`text-xs font-medium ${textSub}`}>총 투자 원금</p>
                  <p className="text-xl font-black mt-1">{totalInvestment.toLocaleString()} <span className="text-xs font-normal opacity-60">원</span></p>
                </div>
                <div className={`${bgCard} p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5`}>
                  <p className="text-xs font-medium text-[#3182F6]">총 평가 금액</p>
                  <p className="text-xl font-black mt-1 text-[#3182F6]">{totalEvaluation.toLocaleString()} <span className="text-xs font-normal opacity-60">원</span></p>
                </div>
              </div>

              {/* 나의 포트폴리오 비중 차트 */}
              <div className={`${bgCard} p-6 rounded-2xl border`}>
                <h2 className="text-base font-bold mb-4 text-center">나의 포트폴리오</h2>
                {stocks.length === 0 ? (
                  <div className={`p-12 text-center text-sm ${textSub}`}>보유 중인 주식이 없습니다.</div>
                ) : (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {pieChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => `${Number(val).toLocaleString()}원`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 보유 종목 리스트 */}
              <div className={`${bgCard} rounded-2xl border overflow-hidden`}>
                <div className="p-5 border-b border-[#28303B] flex justify-between items-center">
                  <h2 className="text-base font-bold">보유 종목 리스트 ({stocks.length})</h2>
                </div>
                {stocks.length === 0 ? (
                  <div className={`p-12 text-center text-sm ${textSub}`}>
                    등록된 보유 종목이 없습니다.<br />오른쪽 입력 양식에서 첫 종목을 추가해 보세요!
                  </div>
                ) : (
                  <div className="divide-y divide-[#28303B]">
                    {stocks.map((s) => {
                      const evalAmount = s.currentPrice * s.quantity;
                      const profit = (s.currentPrice - s.buyPrice) * s.quantity;
                      const rate = (((s.currentPrice - s.buyPrice) / s.buyPrice) * 100).toFixed(2);

                      return (
                        <div key={s.id} className="p-5 flex items-center justify-between hover:opacity-90">
                          <div>
                            <div className="font-bold text-base">{s.name} ({s.symbol})</div>
                            <div className={`text-xs mt-0.5 ${textSub}`}>
                              {s.quantity.toLocaleString()}주 · 평단가 {s.buyPrice.toLocaleString()}원
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-bold text-base">{evalAmount.toLocaleString()}원</div>
                              <div className={`text-xs font-semibold ${Number(rate) >= 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                                {Number(rate) >= 0 ? '+' : ''}{rate}% ({profit > 0 ? '+' : ''}{profit.toLocaleString()}원)
                              </div>
                            </div>
                            <div className="flex gap-1.5 ml-2">
                              {/* [수정 버튼] 누르면 추가 매수 / 분할 매도 모달 오픈 */}
                              <button
                                onClick={() => {
                                  setEditingStock(s);
                                  setTradePrice(s.buyPrice.toString());
                                  setTradeQuantity('1');
                                }}
                                className="px-3 py-1.5 bg-[#3182F6] text-xs font-bold text-white rounded-lg hover:bg-blue-600"
                              >
                                수정
                              </button>
                              <button onClick={() => deleteStock(s.id)} className="px-2.5 py-1.5 bg-[#28303B] text-xs text-gray-400 rounded-lg hover:text-red-400">
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* [우측] 신규 종목 추가 전용 폼 */}
            <div className="lg:col-span-1">
              <div className={`${bgCard} p-6 rounded-2xl border sticky top-6 space-y-4`}>
                <h2 className="text-base font-bold">➕ 종목 추가</h2>
                <p className={`text-xs ${textSub}`}>처음 보유하게 된 주식 종목을 추가해 보세요.</p>

                <form onSubmit={handleAddStockSubmit} className="space-y-4">
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>종목코드</label>
                    <input
                      type="text"
                      placeholder="예: AAPL, 005930"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      required
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>종목명</label>
                    <input
                      type="text"
                      placeholder="예: 애플, 삼성전자"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>매수가 (원)</label>
                    <input
                      type="number"
                      placeholder="단가 입력"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      required
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>수량 (주)</label>
                    <input
                      type="number"
                      placeholder="수량 입력"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#3182F6] hover:bg-blue-600 text-white"
                  >
                    포트폴리오에 등록
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 3. 리그 탭 */}
        {activeTab === 'league' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className={`${bgCard} p-6 rounded-2xl border text-center`}>
              <span className="text-4xl">🏆</span>
              <h2 className="text-xl font-bold mt-2">월간 수익률 리그</h2>
              <p className={`text-xs mt-1 ${textSub}`}>원금 금액은 100% 비공개되며, 수익률(%)만 비교됩니다.</p>
            </div>

            <div className={`${bgCard} rounded-2xl border overflow-hidden`}>
              <div className="p-4 border-b border-[#28303B] flex justify-between items-center text-sm">
                <span className="font-bold">실시간 수익률 리더보드</span>
                <span className={`text-xs ${textSub}`}>🔒 자산 금액 비공개</span>
              </div>
              <div className="divide-y divide-[#28303B]">
                <div className="p-4 flex items-center justify-between bg-yellow-500/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🥇</span>
                    <div>
                      <div className="font-bold text-sm">워렌슈퍼개미 ✔️</div>
                      <div className={`text-xs ${textSub}`}>작물: 엔비디아, 테슬라 🌾</div>
                    </div>
                  </div>
                  <span className="font-bold text-[#F04452] text-sm">+42.10%</span>
                </div>

                <div className="p-4 flex items-center justify-between bg-[#3182F6]/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🥈</span>
                    <div>
                      <div className="font-bold text-sm text-[#3182F6]">{userName} (나) ✔️</div>
                      <div className={`text-xs ${textSub}`}>작물 {stocks.length}개 🌾</div>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${Number(profitRate) >= 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                    {Number(profitRate) >= 0 ? '+' : ''}{profitRate}%
                  </span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🥉</span>
                    <div>
                      <div className="font-bold text-sm">주린이 누나</div>
                      <div className={`text-xs ${textSub}`}>작물: 삼성전자, 카카오 🌾</div>
                    </div>
                  </div>
                  <span className="font-bold text-[#3182F6] text-sm">-2.10%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. 뉴스 및 분석 탭 */}
        {activeTab === 'news' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className={`${bgCard} p-6 rounded-2xl border`}>
              <h2 className="text-lg font-bold mb-1">📰 거시적 시장 분석 & AI 인사이트</h2>
              <p className={`text-xs ${textSub}`}>금일 시장 종합 보고서 및 내 포트폴리오 분석입니다.</p>
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border space-y-2 border-l-4 border-l-emerald-500`}>
              <h3 className="text-base font-bold text-emerald-400">1. 금일 거시적 국내시장 상황 (3줄 요약)</h3>
              <div className={`${bgSubCard} p-4 rounded-xl text-xs space-y-2 border`}>
                <p>1️⃣ **증시 동향**: 코스피 지수는 외국인 순매수세로 반도체 대형주 중심의 강세를 보였습니다.</p>
                <p>2️⃣ **통화 정책**: 금리 정책 수혜 기대감에 따라 금융 및 건설 섹터의 변동성이 존재합니다.</p>
                <p>3️⃣ **환율 흐름**: 원/달러 환율은 달러 약세 흐름에 소폭 하락하며 안정세를 취하고 있습니다.</p>
              </div>
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border space-y-2 border-l-4 border-l-blue-500`}>
              <h3 className="text-base font-bold text-blue-400">2. 금일 거시적 해외시장 상황 (3줄 요약)</h3>
              <div className={`${bgSubCard} p-4 rounded-xl text-xs space-y-2 border`}>
                <p>1️⃣ **뉴욕 증시**: Fed 정책 이벤트를 앞두고 관망세 속에 주요 지수가 혼조세를 보였습니다.</p>
                <p>2️⃣ **빅테크 실적**: 주요 IT 기업들의 실적 호조로 기술주 중심의 순환매가 지속되고 있습니다.</p>
                <p>3️⃣ **원자재 시장**: 국제 유가는 지정학적 리스크 완화 분위기로 안정적인 범위를 형성했습니다.</p>
              </div>
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border space-y-2 border-l-4 border-l-amber-500`}>
              <h3 className="text-base font-bold text-amber-400">3. 금일 내 포트폴리오 분석 (3줄 요약)</h3>
              <div className={`${bgSubCard} p-4 rounded-xl text-xs space-y-2 border`}>
                <p>1️⃣ **수익률 점검**: 현재 포트폴리오 누적 수익률은 **{profitRate}%**를 유지하고 있습니다.</p>
                <p>2️⃣ **비중 리스크**: 특정 종목 비중 쏠림 현상을 방지하기 위해 분산 매수 접근이 권장됩니다.</p>
                <p>3️⃣ **수량 관리**: 추가 매수 및 분할 매도를 통한 수량 및 평가 손익 관리가 적절히 이루어지고 있습니다.</p>
              </div>
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border space-y-3`}>
              <h3 className="text-base font-bold text-purple-400">4. 🤖 AI에게 질문하기</h3>
              <form onSubmit={handleAiAsk} className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 내 포트폴리오 리스크를 줄이는 방안을 알려줘"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className={`flex-1 p-3 rounded-xl text-xs border outline-none focus:border-purple-500 ${bgSubCard}`}
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 rounded-xl">
                  질문하기
                </button>
              </form>
              {aiAnswer && (
                <div className={`${bgSubCard} p-4 rounded-xl text-xs border border-purple-500/30 text-purple-200`}>
                  {aiAnswer}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 5. 메뉴 탭 */}
        {activeTab === 'menu' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className={`${bgCard} p-6 rounded-2xl border`}>
              <h2 className="text-lg font-bold mb-1">📓 내 매매일지 모아보기</h2>
              <p className={`text-xs mb-4 ${textSub}`}>작성한 주식 메모 히스토리입니다.</p>

              {journals.length === 0 ? (
                <div className={`p-8 text-center text-xs ${bgSubCard} rounded-xl border`}>
                  작성된 매매일지가 없습니다. [내 농장] 탭에서 첫 일지를 남겨보세요!
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map((j, idx) => (
                    <div key={idx} className={`${bgSubCard} p-4 rounded-xl border`}>
                      <div className="text-xs text-[#3182F6] font-bold mb-1">{j.date} · 출석보상 완료 ✔️</div>
                      <p className="text-sm leading-relaxed">{j.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border`}>
              <h2 className="text-lg font-bold mb-4">⚙️ 개인 설정</h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-xs mb-1 block ${textSub}`}>닉네임 변경</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                  />
                </div>

                <div className={`${bgSubCard} p-4 rounded-xl border flex items-center justify-between`}>
                  <div>
                    <div className="text-sm font-bold">화면 테마 설정</div>
                    <div className={`text-xs ${textSub}`}>라이트 모드 또는 다크 모드로 화면을 변경합니다.</div>
                  </div>
                  <div className="flex gap-1 bg-[#28303B]/30 p-1 rounded-xl">
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        themeMode === 'dark' ? 'bg-[#3182F6] text-white' : 'text-gray-400'
                      }`}
                    >
                      🌙 다크
                    </button>
                    <button
                      onClick={() => setThemeMode('light')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        themeMode === 'light' ? 'bg-[#3182F6] text-white' : 'text-gray-400'
                      }`}
                    >
                      ☀️ 라이트
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* [모달 팝업] 종목 수정 모달 (추가 매수 / 분할 매도) */}
      {editingStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${bgCard} w-full max-w-md rounded-2xl p-6 border space-y-4 shadow-2xl relative`}>
            <div className="flex justify-between items-center border-b border-[#28303B] pb-3">
              <h3 className="text-base font-bold">✏️ {editingStock.name} ({editingStock.symbol}) 거래 수정</h3>
              <button onClick={() => setEditingStock(null)} className="text-gray-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>거래 단가 (원)</label>
                <input
                  type="number"
                  placeholder="단가 입력"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                  className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>거래 수량 (주)</label>
                <input
                  type="number"
                  placeholder="수량 입력"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                  className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTradeUpdate('BUY')}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                추가 매수
              </button>
              <button
                type="button"
                onClick={() => handleTradeUpdate('SELL')}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white"
              >
                분할 매도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 동물 입양 상점 모달 */}
      {isShopOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${bgCard} w-full max-w-md rounded-2xl p-6 border space-y-4 shadow-2xl relative`}>
            <div className="flex justify-between items-center border-b border-[#28303B] pb-3">
              <h3 className="text-base font-bold">🐾 동물 입양 상점</h3>
              <button onClick={() => setIsShopOpen(false)} className="text-gray-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {animalShop.map((a) => (
                <div key={a.id} className={`${bgSubCard} p-3 rounded-xl border text-center space-y-2`}>
                  <div className="text-3xl">{a.emoji}</div>
                  <div className="text-xs font-bold">{a.name}</div>
                  <button
                    onClick={() => handleBuyAnimal(a)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs py-1.5 rounded-lg font-bold"
                  >
                    💰 {a.price} Gold
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsShopOpen(false)}
              className="w-full bg-[#28303B] text-gray-300 py-2.5 rounded-xl text-xs font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t px-4 py-2.5 z-40 backdrop-blur-md ${isDark ? 'bg-[#1B2128]/95 border-[#28303B]' : 'bg-white/95 border-[#E5E8EB]'}`}>
        <div className="max-w-md mx-auto flex justify-between items-center text-[11px]">
          <button
            onClick={() => setActiveTab('farm')}
            className={`flex flex-col items-center gap-1 font-semibold ${activeTab === 'farm' ? 'text-[#3182F6]' : 'text-gray-400'}`}
          >
            <span className="text-lg">🌾</span>
            <span>내 농장</span>
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex flex-col items-center gap-1 font-semibold ${activeTab === 'portfolio' ? 'text-[#3182F6]' : 'text-gray-400'}`}
          >
            <span className="text-lg">📊</span>
            <span>포트폴리오</span>
          </button>
          <button
            onClick={() => setActiveTab('league')}
            className={`flex flex-col items-center gap-1 font-semibold ${activeTab === 'league' ? 'text-[#3182F6]' : 'text-gray-400'}`}
          >
            <span className="text-lg">🏆</span>
            <span>리그</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex flex-col items-center gap-1 font-semibold ${activeTab === 'news' ? 'text-[#3182F6]' : 'text-gray-400'}`}
          >
            <span className="text-lg">📰</span>
            <span>뉴스 및 분석</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 font-semibold ${activeTab === 'menu' ? 'text-[#3182F6]' : 'text-gray-400'}`}
          >
            <span className="text-lg">☰</span>
            <span>메뉴</span>
          </button>
        </div>
      </nav>
    </main>
  );
}