/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import { useIntl } from "@/locale";
import { useIsLogin, useUserStore } from "@/store/user";

const loaded = import("@/api/storage");

const loadStorageAPI = async () => {
    const lib = await loaded;
    return lib.StorageAPI;
};

const primaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 active:scale-[0.97] text-white shadow-lg shadow-rose-500/20 h-11 px-6 py-2.5`;

const secondaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border border-stone-200/60 dark:border-stone-700/60 text-stone-700 dark:text-stone-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-[0.97] h-11 px-6 py-2.5 w-full shadow-sm`;

const textLinkStyle = `underline text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium cursor-pointer transition-colors text-center mt-1`;

export default function Login() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const [loading] = useUserStore(
        useShallow((state) => {
            return [state.loading];
        }),
    );

    if (isLogin) {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 bg-gradient-to-tr from-rose-100 via-orange-50 to-amber-100 dark:from-stone-950 dark:via-stone-900 dark:to-orange-950/20 flex justify-center items-center z-[999] overflow-hidden p-4">
            <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md w-full max-w-[360px] h-[520px] flex flex-col justify-between items-center rounded-2xl overflow-hidden shadow-2xl border border-white/20 dark:border-stone-800/50">
                <Guide />

                <div className="w-full px-6 pb-8 flex flex-col gap-4 flex-1 justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-stone-500 dark:text-stone-400">
                            <i className="icon-[mdi--loading] animate-spin text-3xl text-rose-500"></i>
                            <div className="text-sm font-medium animate-pulse">
                                {t("login")}...
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 w-full">
                            {/* Github Login */}
                            <div className="flex flex-col gap-1 w-full">
                                <button
                                    type="button"
                                    className={primaryButtonStyle}
                                    onClick={async () => {
                                        const StorageAPI =
                                            await loadStorageAPI();
                                        StorageAPI.loginWith("github");
                                    }}
                                >
                                    <i className="icon-[mdi--github] text-lg"></i>
                                    <span>{t("login-to-github")}</span>
                                </button>
                                <button
                                    type="button"
                                    className={textLinkStyle}
                                    onClick={async () => {
                                        const StorageAPI =
                                            await loadStorageAPI();
                                        StorageAPI.loginManuallyWith("github");
                                    }}
                                >
                                    {t("or-use-an-exist-token")}
                                </button>
                            </div>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                                <span className="flex-shrink mx-4 text-stone-400 text-xs font-semibold uppercase tracking-wider">
                                    {t("offline-mode")}
                                </span>
                                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                            </div>

                            {/* Offline Mode */}
                            <button
                                type="button"
                                className={secondaryButtonStyle}
                                onClick={async () => {
                                    const StorageAPI = await loadStorageAPI();
                                    StorageAPI.loginWith("offline");
                                }}
                            >
                                <i className="icon-[mdi--local] text-lg text-rose-500"></i>
                                <span>{t("offline-mode")}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Guide() {
    const t = useIntl();
    return (
        <div className="w-full p-6 flex-[1.2] flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400 text-white relative shadow-inner">
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                COZY SYNC
            </div>

            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg border border-white/30 animate-bounce">
                💑
            </div>

            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                    {t("APP_NAME") || "Cent"}
                </h1>
                <p className="text-xs opacity-90 font-medium px-4">
                    双人共享记账 · 数据自主掌握
                </p>
            </div>

            <p className="text-[11px] opacity-75 max-w-[240px] leading-relaxed">
                无需购买服务器，以您的 GitHub
                私人仓库作为安全数据库，与另一半共享温馨账本。
            </p>
        </div>
    );
}
