import { wrap } from "comlink";
import modal from "@/components/modal";
import { EmptyEndpoint } from "../endpoints/empty";
import { GithubEndpoint } from "../endpoints/github";
import { OfflineEndpoint } from "../endpoints/offline";
import type { Exposed } from "./worker";
import DeferredWorker from "./worker?worker";

const APIS = {
    github: GithubEndpoint,
    offline: OfflineEndpoint,
};

const SYNC_ENDPOINT_KEY = "SYNC_ENDPOINT";
const type = (localStorage.getItem(SYNC_ENDPOINT_KEY) ??
    "github") as keyof typeof APIS;

const _StorageAPI = APIS[type] ?? EmptyEndpoint;
const actions = _StorageAPI.init({ modal });

export const StorageAPI = {
    name: _StorageAPI.name,
    type: _StorageAPI.type,
    ...actions,
    loginWith: (type: string) => {
        if (type === "github") {
            return GithubEndpoint.login({ modal });
        }
        if (type === "offline") {
            return OfflineEndpoint.login({ modal });
        }
    },
    loginManuallyWith: (type: string) => {
        if (type === "github") {
            return GithubEndpoint.manuallyLogin?.({ modal });
        }
    },
};

// ComlinkSharedWorker

const workerInstance = new DeferredWorker({
    /* normal Worker options*/
});
const StorageDeferredAPI = wrap<Exposed>(workerInstance);

export { StorageDeferredAPI };
