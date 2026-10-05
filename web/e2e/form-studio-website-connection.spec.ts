import { expect, test } from "@playwright/test";

import { provisionOwnedActivity } from "./helpers/e2e-owned-fixtures";
import { loginOperatorSession, openActivityTab } from "./helpers/registration-e2e-api";

test.describe("Form Studio tenant website connection", () => {
  test("Core/Pro operator sees optional website connection on Form tab", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "website-link",
      workerIndex: test.info().workerIndex,
    });
    await openActivityTab(page, owned.id, "form", session);

    await page.locator("#form-studio-tab-build").click();
    const connection = page.getByRole("heading", { name: /Tenant website link/i });
    await expect(connection).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("checkbox", { name: /Show link to my Cohestra website/i })
    ).toBeVisible();
    await expect(page.getByText(/Upgrade to Core/i)).toHaveCount(0);
  });
});
