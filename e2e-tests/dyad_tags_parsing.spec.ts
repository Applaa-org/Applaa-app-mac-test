import { testSkipIfWindows, test } from "./helpers/test_helper";

testSkipIfWindows("dyad tags handles nested < tags", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");
  await po.sendPrompt("tc=dyad-write-angle");
  await po.snapshotAppFiles({ name: "angle-tags-handled" });
});

test("applaa tags parsing and file writing", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");
  await po.sendPrompt("tc=applaa-write-test");
  await po.snapshotAppFiles({ name: "applaa-tags-handled" });
});

test("applaa tags mixed with dyad tags compatibility", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");
  await po.sendPrompt("tc=mixed-tags-test");
  await po.snapshotAppFiles({ name: "mixed-tags-handled" });
});
