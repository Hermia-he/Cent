import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useShallow } from "zustand/shallow";
import PopupLayout from "@/layouts/popup-layout";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import type { AssetAccount } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import createConfirmProvider from "../confirm";
import { Button } from "../ui/button";

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const assets = useLedgerStore(
        useShallow((state) => state.infos?.meta.assets ?? []),
    );

    const [editingAccount, setEditingAccount] =
        useState<Partial<AssetAccount> | null>(null);
    const [nameError, setNameError] = useState("");
    const [amountError, setAmountError] = useState("");

    const accountTypes = [
        { value: "card", label: t("card") },
        { value: "investment", label: t("investment") },
        { value: "wallet", label: t("wallet") },
        { value: "cash", label: t("cash") },
        { value: "other", label: t("other") },
    ];

    const toSave = async () => {
        if (!editingAccount?.name?.trim()) {
            setNameError("请输入账户名称");
            return;
        }
        setNameError("");

        const amountNum = Number(editingAccount.initialAmount);
        if (Number.isNaN(amountNum) || amountNum < 0) {
            setAmountError("请输入合法的金额 (>= 0)");
            return;
        }
        setAmountError("");

        const newAccount: AssetAccount = {
            id: editingAccount.id || uuidv4(),
            name: editingAccount.name.trim(),
            type: (editingAccount.type as AssetAccount["type"]) || "card",
            initialAmount: numberToAmount(amountNum),
        };

        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            if (!prev.assets) {
                prev.assets = [];
            }
            if (editingAccount.id) {
                // Edit existing
                prev.assets = prev.assets.map((a) =>
                    a.id === editingAccount.id ? newAccount : a,
                );
            } else {
                // Add new
                prev.assets.push(newAccount);
            }
            return prev;
        });

        setEditingAccount(null);
    };

    const toDelete = async (id: string) => {
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            if (prev.assets) {
                prev.assets = prev.assets.filter((a) => a.id !== id);
            }
            return prev;
        });
    };

    const totalAssets = assets.reduce((sum, a) => sum + a.initialAmount, 0);

    return (
        <PopupLayout
            title={t("asset-accounts")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="flex flex-col h-full overflow-hidden">
                {/* 顶部总览卡片 */}
                <div className="px-6 py-4 flex-shrink-0">
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-stone-900 dark:to-orange-950/20 border border-rose-100/50 dark:border-rose-950/30 rounded-2xl p-5 shadow-sm">
                        <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                            期初总存款 (共同资产)
                        </div>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                            ¥{amountToNumber(totalAssets).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* 主列表/编辑区 */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {editingAccount ? (
                        // 编辑/新增表单
                        <div className="flex flex-col gap-4 border border-rose-100 dark:border-stone-800 p-5 rounded-2xl bg-stone-50/50 dark:bg-stone-950/30">
                            <h3 className="font-semibold text-sm text-stone-700 dark:text-stone-200">
                                {editingAccount.id
                                    ? t("edit-account")
                                    : t("add-account")}
                            </h3>

                            {/* 账户名称 */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-stone-500 font-bold">
                                    {t("account-name")}
                                </label>
                                <input
                                    type="text"
                                    value={editingAccount.name ?? ""}
                                    onChange={(e) =>
                                        setEditingAccount({
                                            ...editingAccount,
                                            name: e.target.value,
                                        })
                                    }
                                    className="flex h-10 w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                                    placeholder="例如：微信理财通、招商银行卡"
                                />
                                {nameError && (
                                    <span className="text-[10px] text-rose-500 font-bold">
                                        {nameError}
                                    </span>
                                )}
                            </div>

                            {/* 账户类型 */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-stone-500 font-bold">
                                    {t("account-type")}
                                </label>
                                <select
                                    value={editingAccount.type ?? "card"}
                                    onChange={(e) =>
                                        setEditingAccount({
                                            ...editingAccount,
                                            type: e.target.value as any,
                                        })
                                    }
                                    className="flex h-10 w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                                >
                                    {accountTypes.map((type) => (
                                        <option
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 期初余额 */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-stone-500 font-bold">
                                    {t("initial-amount")} (¥)
                                </label>
                                <input
                                    type="number"
                                    value={
                                        editingAccount.initialAmount !==
                                        undefined
                                            ? editingAccount.initialAmount
                                            : ""
                                    }
                                    onChange={(e) =>
                                        setEditingAccount({
                                            ...editingAccount,
                                            initialAmount: e.target
                                                .value as any,
                                        })
                                    }
                                    className="flex h-10 w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                                {amountError && (
                                    <span className="text-[10px] text-rose-500 font-bold">
                                        {amountError}
                                    </span>
                                )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-2 justify-end mt-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingAccount(null)}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-rose-500 hover:bg-rose-600 text-white"
                                    onClick={toSave}
                                >
                                    {t("save")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // 账户列表
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center pb-1">
                                <span className="text-xs text-stone-500 font-bold">
                                    已存账户 ({assets.length})
                                </span>
                                <Button
                                    size="sm"
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold"
                                    onClick={() =>
                                        setEditingAccount({
                                            name: "",
                                            type: "card",
                                            initialAmount: 0,
                                        })
                                    }
                                >
                                    + {t("add-account")}
                                </Button>
                            </div>

                            {assets.length === 0 ? (
                                <div className="text-center py-8 text-xs text-stone-400">
                                    暂无账户数据，请点击右上角新增。
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {assets.map((account) => {
                                        const typeObj = accountTypes.find(
                                            (t) => t.value === account.type,
                                        );
                                        const typeLabel = typeObj
                                            ? typeObj.label
                                            : t("other");
                                        const typeIcon =
                                            account.type === "card"
                                                ? "💳"
                                                : account.type === "investment"
                                                  ? "📈"
                                                  : account.type === "wallet"
                                                    ? "📱"
                                                    : account.type === "cash"
                                                      ? "💵"
                                                      : "🪙";

                                        return (
                                            <div
                                                key={account.id}
                                                className="flex items-center justify-between p-4 border rounded-xl hover:bg-rose-50/20 dark:hover:bg-stone-900/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">
                                                        {typeIcon}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                                                            {account.name}
                                                        </span>
                                                        <span className="text-[10px] text-stone-400 font-medium">
                                                            {typeLabel}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-extrabold text-stone-850 dark:text-stone-100">
                                                        ¥
                                                        {amountToNumber(
                                                            account.initialAmount,
                                                        ).toFixed(2)}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditingAccount(
                                                                    {
                                                                        id: account.id,
                                                                        name: account.name,
                                                                        type: account.type,
                                                                        initialAmount:
                                                                            amountToNumber(
                                                                                account.initialAmount,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                            className="text-stone-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                                                        >
                                                            <i className="icon-[mdi--pencil] text-sm"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toDelete(
                                                                    account.id,
                                                                )
                                                            }
                                                            className="text-stone-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                                                        >
                                                            <i className="icon-[mdi--delete] text-sm"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    );
}

export const [AssetAccountsProvider, showAssetAccounts] = createConfirmProvider(
    Form,
    {
        dialogTitle: "asset-accounts",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[min(520px,calc(100vh-32px))] sm:w-[90vw] sm:max-w-[500px]",
    },
);

export default function AssetAccountsSettingsItem() {
    const t = useIntl();
    return (
        <div className="lab">
            <Button
                onClick={() => {
                    showAssetAccounts();
                }}
                variant="ghost"
                className="w-full py-4 rounded-none h-auto"
            >
                <div className="w-full px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--piggy-bank-outline] size-5 text-rose-500"></i>
                        {t("asset-accounts")}
                    </div>
                    <i className="icon-[mdi--chevron-right] size-5"></i>
                </div>
            </Button>
        </div>
    );
}
