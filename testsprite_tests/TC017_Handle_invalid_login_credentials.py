import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()
        # -> navigate
        await page.goto("http://localhost:5000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the UID, Username, and Security Key with invalid values and submit the login form, then verify a validation error is shown.
        # text input placeholder="j.smith"
        elem = page.locator("xpath=/html/body/div/div/form/div[2]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("invalid.user")
        
        # -> Fill the UID, Username, and Security Key with invalid values and submit the login form, then verify a validation error is shown.
        # password input placeholder="••••••••"
        elem = page.locator("xpath=/html/body/div/div/form/div[3]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("wrongpassword")
        
        # -> Fill the UID, Username, and Security Key with invalid values and submit the login form, then verify a validation error is shown.
        # text input placeholder="G2TC-AS-XXXX-S"
        elem = page.locator("xpath=/html/body/div/div/form/div/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("INVALID-UID-0000")
        
        # -> Fill the UID, Username, and Security Key with invalid values and submit the login form, then verify a validation error is shown.
        # button "Sign In 
arrow_forward"
        elem = page.locator("xpath=/html/body/div/div/form/button").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        await asyncio.sleep(5)
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    