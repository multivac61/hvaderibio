/**
 * Whether the app has finished hydrating the prerendered HTML. Pages mounted
 * before then must render exactly what the HTML holds; pages mounted by later
 * client-side navigations can use live values straight away.
 */
export const app = { hydrated: false };
