import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { amountToNumber } from "@/ledger/bill";
import { cn } from "@/utils";
import { showAssetAccounts } from "../settings/asset-accounts";

interface ShareBoardProps {
    viewDate: dayjs.Dayjs;
}

export default function ShareBoard({ viewDate }: ShareBoardProps) {
    const { bills, infos } = useLedgerStore();
    const currentUser = useUserStore();
    const [showQR, setShowQR] = useState(false);
    const [activeTab, setActiveTab] = useState<"aa" | "assets">("aa");

    const monthStart = viewDate.startOf("month").valueOf();
    const monthEnd = viewDate.endOf("month").valueOf();

    // 1. 资产账户期初配置
    const assetsList = useMemo(() => {
        return infos?.meta.assets ?? [];
    }, [infos]);

    const initialAssetsTotal = useMemo(() => {
        return amountToNumber(assetsList.reduce((sum, a) => sum + a.initialAmount, 0));
    }, [assetsList]);

    // 2. 过滤当月支出与收入
    const monthExpenses = useMemo(() => {
        return bills.filter((b) => b.type === "expense" && b.time >= monthStart && b.time <= monthEnd);
    }, [bills, monthStart, monthEnd]);

    const monthIncomes = useMemo(() => {
        return bills.filter((b) => b.type === "income" && b.time >= monthStart && b.time <= monthEnd);
    }, [bills, monthStart, monthEnd]);

    // 3. 计算历史收支（用于月期初余额计算）
    const historicalStats = useMemo(() => {
        let incomeBefore = 0;
        let expenseBefore = 0;
        for (const bill of bills) {
            if (bill.time < monthStart) {
                if (bill.type === "income") {
                    incomeBefore += bill.amount;
                } else {
                    expenseBefore += bill.amount;
                }
            }
        }
        return {
            incomeBefore: amountToNumber(incomeBefore),
            expenseBefore: amountToNumber(expenseBefore),
        };
    }, [bills, monthStart]);

    // 4. 双人账目 AA 均分及总体收支统计
    const stats = useMemo(() => {
        const creatorsList = infos?.creators ?? [];
        const userMap: Record<string | number, { name: string; avatar?: string }> = {};

        if (currentUser.id) {
            userMap[currentUser.id] = {
                name: currentUser.name || "我",
                avatar: currentUser.avatar_url,
            };
        }

        for (const c of creatorsList) {
            userMap[c.id] = {
                name: c.name,
                avatar: c.avatar_url,
            };
        }

        // 统计每个人在当月的支出
        const expensesByCreator: Record<string | number, number> = {};
        for (const bill of monthExpenses) {
            const cid = bill.creatorId;
            expensesByCreator[cid] = (expensesByCreator[cid] || 0) + bill.amount;
        }

        const allUserIds = Array.from(
            new Set([
                ...(currentUser.id ? [currentUser.id] : []),
                ...creatorsList.map((c) => c.id),
                ...Object.keys(expensesByCreator),
            ]),
        );

        const userA_Id = allUserIds[0] || "userA";
        const userB_Id = allUserIds[1] || "userB";

        const userA_Info = userMap[userA_Id] || { 
            name: currentUser.id === userA_Id ? (currentUser.name || "我") : "成员 A", 
            avatar: "", 
        };
        const userB_Info = userMap[userB_Id] || { 
            name: "另一半", 
            avatar: "", 
        };

        const totalA = amountToNumber(expensesByCreator[userA_Id] || 0);
        const totalB = amountToNumber(expensesByCreator[userB_Id] || 0);
        const totalExpenses = totalA + totalB;

        // AA 均分结算建议
        let advice = "";
        let diff = 0;

        if (totalA > totalB) {
            diff = (totalA - totalB) / 2;
            advice = `${userB_Info.name} 应转账给 ${userA_Info.name} ¥${diff.toFixed(2)}`;
        } else if (totalB > totalA) {
            diff = (totalB - totalA) / 2;
            advice = `${userA_Info.name} 应转账给 ${userB_Info.name} ¥${diff.toFixed(2)}`;
        } else {
            advice = "支出均等，完美平衡 🤝";
        }

        const ratioA = totalExpenses > 0 ? (totalA / totalExpenses) * 100 : 50;
        const ratioB = totalExpenses > 0 ? (totalB / totalExpenses) * 100 : 50;

        // 5. 月度收支结算 (期初、期末余额计算)
        const curMonthIncomeTotal = amountToNumber(monthIncomes.reduce((sum, b) => sum + b.amount, 0));
        const curMonthExpenseTotal = totalExpenses;
        
        const monthStartBalance = initialAssetsTotal + historicalStats.incomeBefore - historicalStats.expenseBefore;
        const monthEndBalance = monthStartBalance + curMonthIncomeTotal - curMonthExpenseTotal;
        const netChange = curMonthIncomeTotal - curMonthExpenseTotal;

        return {
            userA: { id: userA_Id, name: userA_Info.name, avatar: userA_Info.avatar, total: totalA, ratio: ratioA },
            userB: { id: userB_Id, name: userB_Info.name, avatar: userB_Info.avatar, total: totalB, ratio: ratioB },
            totalExpenses,
            curMonthIncomeTotal,
            monthStartBalance,
            monthEndBalance,
            netChange,
            advice,
            diff,
            hasCollaborator: allUserIds.length >= 2 || creatorsList.length > 0,
        };
    }, [monthExpenses, monthIncomes, infos, currentUser, initialAssetsTotal, historicalStats]);

    const { userA, userB, totalExpenses, curMonthIncomeTotal, monthStartBalance, monthEndBalance, netChange, advice, hasCollaborator } = stats;

    return (
        <div className="w-full bg-gradient-to-br from-rose-50/90 via-orange-50/80 to-amber-50/90 dark:from-stone-900/90 dark:via-orange-950/20 dark:to-stone-900/90 border border-rose-100/80 dark:border-rose-950/30 rounded-2xl p-4 shadow-sm shadow-rose-100/20 dark:shadow-none flex flex-col gap-3 transition-all duration-300 hover:shadow-md relative animate-fade-in">
            {/* 头部标题与月份 */}
            <div className="flex justify-between items-center text-xs opacity-75 font-semibold text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏡</span>
                    <span>双人共享看板</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowQR(true)}
                        className="hover:bg-rose-100/80 dark:hover:bg-rose-950/60 p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer text-rose-850 dark:text-rose-300"
                        title="生成网页二维码"
                    >
                        <i className="icon-[mdi--qrcode] text-sm"></i>
                    </button>
                    <div className="bg-rose-100/60 dark:bg-rose-950/40 text-[10px] px-2 py-0.5 rounded-full text-rose-850 dark:text-rose-300 font-bold">
                        {viewDate.format("YYYY年M月")}
                    </div>
                </div>
            </div>

            {/* 选项卡分段控制 */}
            <div className="grid grid-cols-2 rounded-xl bg-stone-150/60 dark:bg-stone-900/60 p-1 border border-stone-200/20 dark:border-stone-850/30 gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab("aa")}
                    className={cn(
                        "py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === "aa"
                            ? "bg-white dark:bg-stone-800 text-rose-600 dark:text-rose-455 shadow-xs border border-rose-100/20"
                            : "text-stone-550 hover:text-stone-700 dark:hover:text-stone-300"
                    )}
                >
                    <i className="icon-[mdi--scale-balance] text-sm"></i>
                    收支分摊
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("assets")}
                    className={cn(
                        "py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === "assets"
                            ? "bg-white dark:bg-stone-800 text-rose-600 dark:text-rose-455 shadow-xs border border-rose-100/20"
                            : "text-stone-550 hover:text-stone-700 dark:hover:text-stone-300"
                    )}
                >
                    <i className="icon-[mdi--piggy-bank-outline] text-sm"></i>
                    共同资产与结余
                </button>
            </div>

            {/* 内容区域 */}
            {activeTab === "aa" ? (
                <div className="flex flex-col gap-3">
                    {/* 本月共享总支出 */}
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">本月共享总支出</span>
                            <span className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
                                ¥{totalExpenses.toFixed(2)}
                            </span>
                        </div>
                        {assetsList.length > 0 && (
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">月底预估结余</span>
                                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                                    ¥{monthEndBalance.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 双方支出条 */}
                    <div className="flex flex-col gap-2.5 mt-1">
                        <div className="flex justify-between items-center">
                            {/* User A */}
                            <div className="flex items-center gap-2">
                                {userA.avatar ? (
                                    <img
                                        src={userA.avatar}
                                        alt={userA.name}
                                        className="w-8 h-8 rounded-full border border-rose-200 object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-sm shadow-sm">
                                        👩‍💻
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 line-clamp-1 max-w-[80px]">
                                        {userA.name}
                                    </span>
                                    <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                                        ¥{userA.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Ratio Badge */}
                            <div className="text-[10px] font-bold text-stone-400 bg-stone-100 dark:bg-stone-800/80 px-2 py-0.5 rounded-md">
                                {userA.ratio.toFixed(0)}% : {userB.ratio.toFixed(0)}%
                            </div>

                            {/* User B */}
                            <div className="flex items-center gap-2 flex-row-reverse text-right">
                                {userB.avatar ? (
                                    <img
                                        src={userB.avatar}
                                        alt={userB.name}
                                        className="w-8 h-8 rounded-full border border-orange-200 object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-sm shadow-sm">
                                        🧑‍🎨
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 line-clamp-1 max-w-[80px]">
                                        {userB.name}
                                    </span>
                                    <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                                        ¥{userB.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 支出分配占比比例条 */}
                        <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-850 overflow-hidden flex">
                            <div
                                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500 ease-out"
                                style={{ width: `${userA.ratio}%` }}
                            />
                            <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 ease-out"
                                style={{ width: `${userB.ratio}%` }}
                            />
                        </div>
                    </div>

                    {/* 结算建议 alert */}
                    {totalExpenses > 0 && (
                        <div className="bg-white/60 dark:bg-stone-950/40 border border-rose-200/50 dark:border-rose-900/30 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 transition-all">
                            <div className="flex items-center gap-2">
                                <span>💡</span>
                                <span>{advice}</span>
                            </div>
                            <i className="icon-[mdi--swap-horizontal] text-rose-455 text-base"></i>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4 pb-1">
                    {/* 资产结余数据网格 */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* 期初总存款 */}
                        <div className="bg-white/50 dark:bg-stone-950/30 border border-stone-200/20 dark:border-stone-850/40 rounded-xl p-2.5 flex flex-col gap-1 shadow-xs">
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1">
                                🐖 期初存款
                            </span>
                            <span className="text-xs font-black text-stone-800 dark:text-stone-150 truncate" title={`¥${monthStartBalance.toFixed(2)}`}>
                                ¥{monthStartBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* 本月变动 */}
                        <div className="bg-white/50 dark:bg-stone-950/30 border border-stone-200/20 dark:border-stone-850/40 rounded-xl p-2.5 flex flex-col gap-1 shadow-xs">
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1">
                                {netChange >= 0 ? "📈" : "📉"} 本月变动
                            </span>
                            <span className={cn(
                                "text-xs font-black truncate",
                                netChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-455"
                            )} title={`${netChange >= 0 ? "+" : ""}¥${netChange.toFixed(2)}`}>
                                {netChange >= 0 ? "+" : ""}¥{netChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-[8px] font-bold ml-0.5">
                                    ({netChange >= 0 ? "多了" : "少了"})
                                </span>
                            </span>
                        </div>

                        {/* 月底预估结余 */}
                        <div className="bg-white/50 dark:bg-stone-950/30 border border-stone-200/20 dark:border-stone-850/40 rounded-xl p-2.5 flex flex-col gap-1 shadow-xs">
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1">
                                💰 月底结余
                            </span>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-455 truncate" title={`¥${monthEndBalance.toFixed(2)}`}>
                                ¥{monthEndBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* 共同资产存放渠道列表 */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] text-stone-450 dark:text-stone-400 font-black uppercase tracking-wider flex items-center gap-1">
                                <i className="icon-[mdi--wallet-outline] text-[11px] text-rose-500"></i>
                                共同资产账户分布
                            </span>
                            {assetsList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => showAssetAccounts()}
                                    className="text-[9px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-950/20 transition-all shadow-2xs"
                                >
                                    <i className="icon-[mdi--pencil] text-[8px]"></i>
                                    管理资产
                                </button>
                            )}
                        </div>

                        {assetsList.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center bg-white/30 dark:bg-stone-950/10 border border-dashed border-rose-250/30 dark:border-stone-800/40 rounded-2xl animate-fade-in">
                                <span className="text-[11px] text-stone-550 dark:text-stone-400 font-medium leading-relaxed">
                                    尚未配置期初资产余额（存款与理财）
                                </span>
                                <button
                                    type="button"
                                    onClick={() => showAssetAccounts()}
                                    className="text-xs font-bold hover:scale-[1.02] cursor-pointer bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-955/35 dark:text-rose-350 dark:hover:bg-rose-950/50 px-4 py-1.5 rounded-full border border-rose-200/30 transition-all shadow-2xs"
                                >
                                    点击配置存款与理财 ➜
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs animate-fade-in">
                                {assetsList.map((account) => {
                                    const typeIcon = 
                                        account.type === "card" ? "💳" :
                                        account.type === "investment" ? "📈" :
                                        account.type === "wallet" ? "📱" :
                                        account.type === "cash" ? "💵" : "🪙";
                                    const typeLabel = 
                                        account.type === "card" ? "银行卡" :
                                        account.type === "investment" ? "理财" :
                                        account.type === "wallet" ? "电子钱包" :
                                        account.type === "cash" ? "现金" : "其它";
                                    return (
                                        <div 
                                            key={account.id} 
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 dark:bg-stone-950/20 border border-stone-200/30 dark:border-stone-850/40 hover:bg-white/80 dark:hover:bg-stone-950/50 transition-colors shadow-2xs"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="text-sm flex-shrink-0">{typeIcon}</span>
                                                <div className="flex flex-col truncate">
                                                    <span className="font-semibold text-stone-700 dark:text-stone-250 truncate text-[11px] leading-tight" title={account.name}>
                                                        {account.name}
                                                    </span>
                                                    <span className="text-[8px] text-stone-400 dark:text-stone-550 font-bold">
                                                        {typeLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-black text-stone-850 dark:text-stone-100 flex-shrink-0 ml-1">
                                                ¥{amountToNumber(account.initialAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 如果还未配置另一半 */}
            {!hasCollaborator && (
                <div className="text-[10px] text-stone-450 dark:text-stone-500 leading-relaxed border-t border-rose-100/30 pt-2 flex flex-col gap-0.5">
                    <span className="font-semibold text-rose-600/70 dark:text-rose-450/70 flex items-center gap-1">
                        📢 独立账本提示
                    </span>
                    <span>
                        当前为您个人账本。若要共享，请在【设置】-【记账账本】点击【邀请】添加对方 GitHub 账号为协作者，并在对方设备上配置相同的 Token。
                    </span>
                </div>
            )}

            {/* 二维码分享 Modal Overlay */}
            {showQR && (
                <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 max-w-[300px] w-full flex flex-col items-center gap-4 shadow-2xl relative border border-rose-100/10">
                        <button
                            type="button"
                            onClick={() => setShowQR(false)}
                            className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                        >
                            <i className="icon-[mdi--close] text-xl"></i>
                        </button>
                        
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">手机扫码快速访问</h3>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">使用微信扫码，可直接用手机记账</p>
                        </div>
                        
                        <div className="w-[180px] h-[180px] bg-white p-2.5 rounded-xl border border-stone-100 dark:border-stone-850 flex items-center justify-center shadow-inner">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=f43f5e&data=${encodeURIComponent(window.location.href)}`}
                                alt="Web App QR Code"
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>

                        <div className="text-[10px] text-stone-550 dark:text-stone-400 text-center leading-relaxed px-1">
                            提示：在手机微信中打开后，点击右上角菜单选择“<b>浮窗</b>”或“<b>添加到桌面</b>”即可像原生 App 一样快速使用。
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
