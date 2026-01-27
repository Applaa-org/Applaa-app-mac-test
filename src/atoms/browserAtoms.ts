import { atom } from "jotai";

/**
 * Atoms for Browser Agent state persistence
 * These ensure that the browser's navigation state survives component remounts
 */

// The current URL intended to be displayed in the BrowserView
export const browserDisplayUrlAtom = atom<string>("");

// The URL currently in the address bar input field
export const browserAddressInputAtom = atom<string>("");

// Global loading state for the browser
export const browserIsLoadingAtom = atom<boolean>(false);

// Window title for the browser
export const browserPageTitleAtom = atom<string>("Applaa Buddy");
