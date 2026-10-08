import { expect, test } from "@playwright/test"
import { features, hero, nav, site } from "../web/content/landing"

test("hero renders the headline and CTAs", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: hero.title })).toBeVisible()
  await expect(page.getByRole("link", { name: hero.primaryCta.label }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: hero.secondaryCta.label }).first()).toBeVisible()
})

test("nav anchors jump to their sections", async ({ page }) => {
  await page.goto("/")
  for (const entry of nav) {
    const section = entry.href.replace("#", "")
    await page.getByRole("link", { name: entry.label }).first().click()
    await expect(page.locator(`#${section}`)).toBeVisible()
  }
})

test("every documented feature has a section on the page", async ({ page }) => {
  await page.goto("/#features")
  for (const feature of features) {
    await expect(page.getByText(feature.title, { exact: false }).first()).toBeVisible()
  }
})

test("page title matches the site name", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(new RegExp(site.name, "i"))
})
