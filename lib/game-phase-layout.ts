/**
 * Shared layout chrome for game phase panels: consistent width & placement;
 * vertical size may still vary per phase (fixed-height split vs scrolling flow).
 *
 * Below `lg`: task + site cards are in normal flow (stacked, centered) so the
 * main panel can use full width without `calc(100% - 28rem)` (which broke on
 * narrow viewports next to fixed `w-64` absolutes).
 *
 * `lg` and up: helper + site are absolutely positioned; main panel width is
 * `min(56rem, calc(100% - 38rem))` to reserve two 16rem rails plus gutters.
 */

/** Full viewport slice under the shared top bar */
export const GAME_PHASE_ROOT_CLASS =
  "relative flex min-h-[calc(100dvh-8rem)] min-h-[calc(100vh-8rem)] w-full flex-col overflow-x-hidden overflow-y-auto px-3 pb-28 sm:px-4 lg:block lg:min-h-[calc(100vh-8rem)] lg:px-0 lg:pb-6"

/** Task instructions card — stacked on small screens; top-left on lg+ */
export const GAME_HELPER_CARD_CLASS =
  "relative z-10 mx-auto mb-3 w-full max-w-md shrink-0 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm lg:absolute lg:top-3 lg:left-6 lg:mb-0 lg:max-w-none lg:w-64 lg:shrink-0 lg:mx-0"

/** Site requirements card — stacked under helper on small screens; top-right on lg+ */
export const GAME_SITE_INFO_CARD_CLASS =
  "relative z-10 mx-auto mb-3 w-full max-w-md shrink-0 max-h-[min(42vh,22rem)] overflow-y-auto rounded-xl bg-[#FFF9C4] p-4 shadow-lg lg:absolute lg:top-3 lg:right-6 lg:left-auto lg:mb-0 lg:max-h-[calc(100%-2rem)] lg:max-w-none lg:w-64 lg:mx-0"

/** Key drawer — bottom-right anchor */
export const GAME_KEY_PANEL_OUTER_CLASS =
  "absolute right-4 bottom-6 z-20 max-lg:right-3 max-lg:bottom-4 lg:right-6 lg:bottom-8"

export function gameKeyPanelInnerClass(expanded: boolean): string {
  return `overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all duration-200 ${expanded ? "w-48" : "w-20"}`
}

export const GAME_KEY_TOGGLE_BTN_CLASS =
  "flex w-full items-center justify-between px-4 py-2 font-medium text-white"

/** Main panel: Phase 0 / 2 split (shell holds flex + scale stage inside components) */
export const GAME_MAIN_PANEL_SPLIT_CLASS =
  "relative z-[5] mx-auto mb-4 flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:p-5 lg:mt-3 lg:mb-4 lg:h-[calc(100%-4rem)] lg:w-[min(56rem,calc(100%-38rem))] lg:max-w-none lg:p-5"

/** Main panel: Phase 1 — single column, scrolls inside panel when tall */
export const GAME_MAIN_PANEL_FLOW_WHITE_CLASS =
  "relative z-[5] mx-auto mb-4 flex min-h-0 w-full max-w-4xl flex-1 flex-col max-h-none overflow-y-auto rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:p-5 lg:mt-3 lg:max-h-[calc(100%-2rem)] lg:w-[min(56rem,calc(100%-38rem))] lg:max-w-none lg:p-5"

/** Phase 3 / 4 teal tint — scroll inside panel when content is tall */
export const GAME_MAIN_PANEL_FLOW_TEAL_CLASS =
  "relative z-[5] mx-auto mb-4 flex min-h-0 w-full max-w-4xl flex-1 flex-col max-h-none overflow-y-auto rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] p-4 shadow-xl backdrop-blur-sm sm:p-5 lg:mt-3 lg:max-h-[calc(100%-2rem)] lg:w-[min(56rem,calc(100%-38rem))] lg:max-w-none lg:p-5"

/** Phase 3 prospect pool — tall 5×2 grid; omit inner scroll so bottom row is not clipped */
export const GAME_MAIN_PANEL_P3_CLASS =
  "relative z-[5] mx-auto mb-4 flex min-h-0 w-full max-w-4xl flex-1 flex-col rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] px-4 py-4 shadow-xl backdrop-blur-sm sm:px-5 lg:mt-3 lg:w-[min(56rem,calc(100%-38rem))] lg:max-w-none"

/** Phase 4 treatment — same teal flow shell; tray stays fixed 5×2 inside */
export const GAME_MAIN_PANEL_P4_CLASS = GAME_MAIN_PANEL_FLOW_TEAL_CLASS
