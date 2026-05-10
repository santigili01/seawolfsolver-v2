/**
 * Shared layout chrome for game phase panels: consistent width & placement;
 * vertical size may still vary per phase (fixed-height split vs scrolling flow).
 */

/** Full viewport slice under the shared top bar */
export const GAME_PHASE_ROOT_CLASS =
  "relative h-[calc(100vh-8rem)] w-full overflow-x-hidden overflow-y-auto pb-6"

/** Task instructions card — top-left (panel already sits below SharedTopBar; small gap only) */
export const GAME_HELPER_CARD_CLASS =
  "absolute top-3 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm"

/** Site requirements card — top-right */
export const GAME_SITE_INFO_CARD_CLASS =
  "absolute top-3 right-6 z-10 w-64 max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#FFF9C4] p-4 shadow-lg"

/** Key drawer — bottom-right anchor */
export const GAME_KEY_PANEL_OUTER_CLASS = "absolute right-6 bottom-8 z-20"

export function gameKeyPanelInnerClass(expanded: boolean): string {
  return `overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all duration-200 ${expanded ? "w-48" : "w-20"}`
}

export const GAME_KEY_TOGGLE_BTN_CLASS =
  "flex w-full items-center justify-between px-4 py-2 font-medium text-white"

/** Main panel: Phase 0 / 2 split (left rail + columns), fixed height within root */
export const GAME_MAIN_PANEL_SPLIT_CLASS =
  "relative z-[5] mx-auto mt-3 mb-4 flex h-[calc(100%-4rem)] min-h-0 w-[min(1200px,calc(100%-12rem))] gap-6 overflow-hidden rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm"

/** Main panel: Phase 1 — single column, scrolls inside panel when tall */
export const GAME_MAIN_PANEL_FLOW_WHITE_CLASS =
  "relative z-[5] mx-auto mt-3 mb-4 max-h-[calc(100%-2rem)] min-h-0 w-[min(1200px,calc(100%-12rem))] overflow-y-auto rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm"

/** Main panel: Phase 3 / 4 — teal tint, same geometry as flow white */
export const GAME_MAIN_PANEL_FLOW_TEAL_CLASS =
  "relative z-[5] mx-auto mt-3 mb-4 max-h-[calc(100%-2rem)] min-h-0 w-[min(1200px,calc(100%-12rem))] overflow-y-auto rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] p-5 shadow-xl backdrop-blur-sm"

/** Phase 3 prospect pool — tall 5×2 grid; omit inner scroll so bottom row is not clipped */
export const GAME_MAIN_PANEL_P3_CLASS =
  "relative z-[5] mx-auto mt-3 mb-4 w-[min(1200px,calc(100%-12rem))] rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] px-5 py-4 shadow-xl backdrop-blur-sm"
