export {
  swipe,
  waitReady,
  shotResult,
} from "../../scripts/lib/pointer-input.mjs";
export async function eventListenerCount(
  page: import("@playwright/test").Page,
) {
  const client = await page.context().newCDPSession(page);
  const { result } = await client.send("Runtime.evaluate", {
    expression: "document.querySelector('main.game')",
  });
  const { listeners } = await client.send("DOMDebugger.getEventListeners", {
    objectId: result.objectId!,
  });
  await client.detach();
  return listeners.length;
}
