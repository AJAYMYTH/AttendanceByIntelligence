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
        
        # -> Fill the UID, Username, and Security Key fields and click the Sign In button to authenticate.
        # text input placeholder="G2TC-AS-XXXX-S"
        elem = page.locator("xpath=/html/body/div/div/form/div/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("G2TC-AS-6354-S")
        
        # -> Fill the UID, Username, and Security Key fields and click the Sign In button to authenticate.
        # text input placeholder="j.smith"
        elem = page.locator("xpath=/html/body/div/div/form/div[2]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("staff.gttc.s1")
        
        # -> Fill the UID, Username, and Security Key fields and click the Sign In button to authenticate.
        # password input placeholder="••••••••"
        elem = page.locator("xpath=/html/body/div/div/form/div[3]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("staff@gttc.edu")
        
        # -> Fill the UID, Username, and Security Key fields and click the Sign In button to authenticate.
        # button "Sign In 
arrow_forward"
        elem = page.locator("xpath=/html/body/div/div/form/button").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Open the Students tab and locate the manual enrollment flow (Students -> Enrollment).
        # "person
Students"
        elem = page.locator("xpath=/html/body/div[2]/aside/nav/div[2]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Fill the Full Name and Register Number fields, set Assigned Section to '2nd Year DAIML' (context-setting) and stop so the page can update. After that, click Register Student and verify the student appears under the Registry Browser for t...
        # text input placeholder="Name"
        elem = page.locator("xpath=/html/body/div[2]/main/div/div[2]/div/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Auto Test Student")
        
        # -> Fill the Full Name and Register Number fields, set Assigned Section to '2nd Year DAIML' (context-setting) and stop so the page can update. After that, click Register Student and verify the student appears under the Registry Browser for t...
        # text input placeholder="Reg No"
        elem = page.locator("xpath=/html/body/div[2]/main/div/div[2]/div[2]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("TS2026-001")
        
        # -> Click the 'Register Student' button to submit the enrollment, then open the Registry Browser and select '2nd Year DAIML' to verify the new student appears.
        # button "Register Student"
        elem = page.locator("xpath=/html/body/div[2]/main/div/div[2]/button").nth(0)
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
    