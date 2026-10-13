'use client';
import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Stock {
  id: number;
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'farm' | 'portfolio' | 'league' | 'news' | 'menu'>('farm');
  
  // 테마 상태 (다크 모드 / 라이트 모드)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // 기본 사용자 정보
  const [userName, setUserName] = useState('투자왕');
  const [title, setTitle] = useState('나만의 농장');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  
  // 게임 요소 (골드, 보유 동물, 수확/물주기 상태, 상점 팝업)
  const [gold, setGold] = useState(1000);
  const [myAnimals, setMyAnimals] = useState<string[]>(['🐣', '🐮']);
  const [isWateredToday, setIsWateredToday] = useState(false);
  const [isHarvestedToday, setIsHarvestedToday] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  // 매매일지 및 출석
  const [journalNote, setJournalNote] = useState('');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isAttendanceDone, setIsAttendanceDone] = useState(false);

  // 입력 폼
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  // 동물 상점 리스트
  const animalShop: Animal[] = [
    { id: 'chick', name: '아기 병아리', emoji: '🐣', price: 500 },
    { id: 'cow', name: '젖소', emoji: '🐮', price: 1200 },
    { id: 'pig', name: '복돼지', emoji: '🐷', price: 2000 },
    { id: 'alpaca', name: '알파카', emoji: '🦙', price: 3500 },
    { id: 'golden_cow', name: '황금 소', emoji: '🐂', price: 5000 },
  ];

  // 저장소 데이터 불러오기
  useEffect(() => {
    const savedStocks = localStorage.getItem('farm_portfolio_stocks');
    const savedTitle = localStorage.getItem('farm_portfolio_title');
    const savedName = localStorage.getItem('farm_user_name');
    const savedJournals = localStorage.getItem('farm_portfolio_journals');
    const savedGold = localStorage.getItem('farm_gold');
    const savedAnimals = localStorage.getItem('farm_animals');
    const savedTheme = localStorage.getItem('farm_theme_mode');

    if (savedStocks) setStocks(JSON.parse(savedStocks));
    if (savedTitle) setTitle(savedTitle);
    if (savedName) setUserName(savedName);
    if (savedJournals) setJournals(JSON.parse(savedJournals));
    if (savedGold) setGold(Number(savedGold));
    if (savedAnimals) setMyAnimals(JSON.parse(savedAnimals));
    if (savedTheme) setThemeMode(savedTheme as 'dark' | 'light');
  }, []);

  // 저장소 데이터 자동 저장
  useEffect(() => {
    localStorage.setItem('farm_portfolio_stocks', JSON.stringify(stocks));
    localStorage.setItem('farm_portfolio_title', title);
    localStorage.setItem('farm_user_name', userName);
    localStorage.setItem('farm_portfolio_journals', JSON.stringify(journals));
    localStorage.setItem('farm_gold', gold.toString());
    localStorage.setItem('farm_animals', JSON.stringify(myAnimals));
    localStorage.setItem('farm_theme_mode', themeMode);
  }, [stocks, title, userName, journals, gold, myAnimals, themeMode]);

  // 자산 연산
  const totalInvestment = stocks.reduce((acc, s) => acc + s.buyPrice * s.quantity, 0);
  const totalEvaluation = stocks.reduce((acc, s) => acc + s.currentPrice * s.quantity, 0);
  const totalProfit = totalEvaluation - totalInvestment;
  const profitRate = totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(2) : '0.00';

  // 가장 비중이 큰 상위 3개 주식 추출
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

  // 종목 추가/수정
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !buyPrice || !currentPrice || !quantity) return;

    if (editingId !== null) {
      setStocks(
        stocks.map((s) =>
          s.id === editingId
            ? { ...s, name, buyPrice: Number(buyPrice), currentPrice: Number(currentPrice), quantity: Number(quantity) }
            : s
        )
      );
      setEditingId(null);
    } else {
      setStocks([
        ...stocks,
        { id: Date.now(), name, buyPrice: Number(buyPrice), currentPrice: Number(currentPrice), quantity: Number(quantity) },
      ]);
    }

    setName('');
    setBuyPrice('');
    setCurrentPrice('');
    setQuantity('');
  };

  const handleEditClick = (stock: Stock) => {
    setEditingId(stock.id);
    setName(stock.name);
    setBuyPrice(stock.buyPrice.toString());
    setCurrentPrice(stock.currentPrice.toString());
    setQuantity(stock.quantity.toString());
  };

  const deleteStock = (id: number) => {
    setStocks(stocks.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setName('');
      setBuyPrice('');
      setCurrentPrice('');
      setQuantity('');
    }
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

  const chartData = {
    labels: stocks.map((s) => s.name),
    datasets: [
      {
        data: stocks.map((s) => s.currentPrice * s.quantity),
        backgroundColor: ['#3182F6', '#F04452', '#00C49F', '#FFBB28', '#8884D8', '#FF8042'],
        borderWidth: 0,
      },
    ],
  };

  // 테마별 스타일
  const isDark = themeMode === 'dark';
  const bgMain = isDark ? 'bg-[#101418] text-white' : 'bg-[#F2F4F6] text-[#191F28]';
  const bgCard = isDark ? 'bg-[#1B2128] border-[#28303B]' : 'bg-white border-[#E5E8EB] shadow-sm';
  const bgSubCard = isDark ? 'bg-[#101418] border-[#28303B]' : 'bg-[#F9FAFB] border-[#E5E8EB]';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <main className={`min-h-screen ${bgMain} pb-28 pt-6 px-4 md:px-8 transition-colors duration-200`}>
      {/* 동물이 자유롭게 걸어다니는 CSS 애니메이션 정의 */}
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
            
            {/* [개선된 첫번째 박스] 일체형 카드 레이아웃 대시보드 */}
            <div className={`${bgCard} p-6 rounded-2xl border space-y-6 shadow-sm`}>
              
              {/* 상단 웰컴 & 골드 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#28303B]/40 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                  </div>
                  <p className={`text-xs ${textSub}`}>
                    <span className="text-[#3182F6] font-bold">{userName}</span>님, 오늘도 포트폴리오를 점검해 보세요! 👋
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                    💰 {gold.toLocaleString()} Gold
                  </span>
                </div>
              </div>

              {/* 하단 자산 브리핑 3컬럼 레이아웃 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`${bgSubCard} p-3.5 rounded-xl border text-left`}>
                  <p className={`text-[11px] font-medium ${textSub}`}>총 평가 자산</p>
                  <p className="text-lg font-black mt-1">
                    {totalEvaluation.toLocaleString()} <span className="text-xs font-normal opacity-60">원</span>
                  </p>
                </div>

                <div className={`${bgSubCard} p-3.5 rounded-xl border text-left`}>
                  <p className={`text-[11px] font-medium ${textSub}`}>총 매수 원금</p>
                  <p className="text-lg font-black mt-1">
                    {totalInvestment.toLocaleString()} <span className="text-xs font-normal opacity-60">원</span>
                  </p>
                </div>

                <div className={`${bgSubCard} p-3.5 rounded-xl border text-left`}>
                  <p className={`text-[11px] font-medium ${textSub}`}>누적 평가 손익</p>
                  <p className={`text-lg font-black mt-1 ${Number(profitRate) >= 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                    {Number(profitRate) >= 0 ? '+' : ''}{profitRate}%
                    <span className="text-xs font-normal opacity-80 block text-gray-400">
                      ({totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()}원)
                    </span>
                  </p>
                </div>
              </div>

            </div>

            {/* [개선된 두번째 박스] 좌(식물 밭) / 우(걸어다니는 동물 방목장) 분리 농장 */}
            <div className="relative rounded-2xl border border-[#28303B] overflow-hidden bg-emerald-950/40 p-6 min-h-[340px] flex flex-col justify-between shadow-inner">
              
              {/* 상단 툴바 */}
              <div className="flex justify-between items-center z-10">
                <span className="text-xs font-bold bg-black/50 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                  🌾 내 포트폴리오 농장
                </span>
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3.5 py-2 rounded-xl shadow transition-transform active:scale-95"
                >
                  🛒 동물 상점 열기
                </button>
              </div>

              {/* 좌우 분리 메인 농장 디스플레이 */}
              <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-[180px]">
                
                {/* [왼쪽] 보유 비중 상위 3개 주식 식물 밭 */}
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

                {/* [오른쪽] 동물들이 자유롭게 걸어다니는 방목장 */}
                <div className="bg-black/30 border border-amber-500/20 p-4 rounded-xl relative min-h-[140px] flex flex-col justify-between overflow-hidden">
                  <span className="text-[10px] font-bold text-amber-400 mb-2 bg-amber-950/80 px-2 py-0.5 rounded w-fit">
                    🐾 동물 자유 방목장 ({myAnimals.length}마리)
                  </span>

                  {/* 걸어다니는 동물 트랙 */}
                  <div className="relative h-20 w-full overflow-hidden flex items-center">
                    {myAnimals.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center w-full">
                        상점에서 동물을 입양하면 이곳에서 거닙니다!
                      </div>
                    ) : (
                      myAnimals.map((emoji, idx) => (
                        <div
                          key={idx}
                          className="absolute text-3xl animate-walk cursor-pointer hover:scale-125 transition-transform"
                          style={{
                            top: `${(idx * 22) % 45}px`,
                            animationDelay: `${idx * 1.5}s`,
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

              {/* 하단 액션 버튼 */}
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
              {stocks.length > 0 && (
                <div className={`${bgCard} p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6`}>
                  <div>
                    <h2 className="text-base font-bold">자산 구성 비중 차트</h2>
                    <p className={`text-xs mt-1 ${textSub}`}>포트폴리오 종목별 투자 비율입니다.</p>
                  </div>
                  <div className="w-40 h-40">
                    <Doughnut data={chartData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} />
                  </div>
                </div>
              )}

              <div className={`${bgCard} rounded-2xl border overflow-hidden`}>
                <div className="p-5 border-b border-[#28303B] flex justify-between items-center">
                  <h2 className="text-base font-bold">보유 종목 리스트 ({stocks.length})</h2>
                  <span className={`text-xs ${textSub}`}>총 매수원금 {totalInvestment.toLocaleString()}원</span>
                </div>
                {stocks.length === 0 ? (
                  <div className={`p-12 text-center text-sm ${textSub}`}>
                    등록된 보유 종목이 없습니다.<br />오른쪽 입력 양식에서 종목을 추가해 보세요!
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
                            <div className="font-bold text-base">{s.name}</div>
                            <div className={`text-xs mt-0.5 ${textSub}`}>
                              {s.quantity.toLocaleString()}주 · 평균가 {s.buyPrice.toLocaleString()}원
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <div className="font-bold text-base">{evalAmount.toLocaleString()}원</div>
                              <div className={`text-xs font-semibold ${Number(rate) >= 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                                {Number(rate) >= 0 ? '+' : ''}{rate}% ({profit > 0 ? '+' : ''}{profit.toLocaleString()}원)
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <button onClick={() => handleEditClick(s)} className="px-2.5 py-1 bg-[#28303B] text-gray-300 rounded-lg">
                                수정
                              </button>
                              <button onClick={() => deleteStock(s.id)} className="px-2.5 py-1 bg-[#28303B] text-gray-400 rounded-lg hover:text-red-400">
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

            <div className="lg:col-span-1">
              <div className={`${bgCard} p-6 rounded-2xl border sticky top-6`}>
                <h2 className="text-base font-bold mb-4">
                  {editingId !== null ? '✏️ 종목 정보 수정' : '➕ 종목 추가 및 등록'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>종목명</label>
                    <input
                      type="text"
                      placeholder="예: 삼성전자, 애플, NVIDIA"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>평균 매수가 (원)</label>
                    <input
                      type="number"
                      placeholder="매수 단가 입력"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>현재가 (원)</label>
                    <input
                      type="number"
                      placeholder="현재 주가 입력"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>보유 수량 (주)</label>
                    <input
                      type="number"
                      placeholder="수량 입력"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={`w-full p-3 rounded-xl text-sm border outline-none focus:border-[#3182F6] ${bgSubCard}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
                      editingId !== null ? 'bg-[#F04452] text-white' : 'bg-[#3182F6] text-white'
                    }`}
                  >
                    {editingId !== null ? '수정 내용 저장' : '포트폴리오에 추가'}
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
              <h2 className="text-lg font-bold mb-1">📰 AI & 증권 인사이트</h2>
              <p className={`text-xs ${textSub}`}>기업 보고서를 AI가 3줄 요약해 드립니다.</p>
            </div>

            <div className={`${bgCard} p-6 rounded-2xl border space-y-3`}>
              <div className="flex justify-between items-center text-xs">
                <span className="bg-blue-500/10 text-[#3182F6] px-2.5 py-1 rounded-full font-bold">🤖 AI 사업보고서 요약</span>
                <span className={textSub}>오늘 10:30</span>
              </div>
              <h3 className="text-base font-bold">삼성전자 3분기 실적 및 HBM 반도체 전망</h3>
              <div className={`${bgSubCard} p-4 rounded-xl text-xs space-y-2 border`}>
                <p>1️⃣ **HBM 공급 확대**: 주요 빅테크 납품 본격화로 메모리 매출 개선 기대</p>
                <p>2️⃣ **파운드리 적자 축소**: 수율 안정화로 하반기 실적 반등 모멘텀</p>
                <p>3️⃣ **투자자 제언**: 역사적 하단 구간, 장기 분할 매수 유효</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. 메뉴 탭 */}
        {activeTab === 'menu' && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* 매매일지 모아보기 */}
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

            {/* 환경 설정 */}
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

      {/* 팝업 레이어: 동물 입양 상점 모달 */}
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