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
        
        # -> Fill the UID, Username, and Security Key fields and submit the login form (Sign In).
        # text input placeholder="G2TC-AS-XXXX-S"
        elem = page.locator("xpath=/html/body/div/div/form/div/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("G2TC-AS-6354-S")
        
        # -> Fill the UID, Username, and Security Key fields and submit the login form (Sign In).
        # text input placeholder="j.smith"
        elem = page.locator("xpath=/html/body/div/div/form/div[2]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("staff.gttc.s1")
        
        # -> Fill the UID, Username, and Security Key fields and submit the login form (Sign In).
        # password input placeholder="••••••••"
        elem = page.locator("xpath=/html/body/div/div/form/div[3]/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("staff@gttc.edu")
        
        # -> Fill the UID, Username, and Security Key fields and submit the login form (Sign In).
        # button "Sign In 
arrow_forward"
        elem = page.locator("xpath=/html/body/div/div/form/button").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Open the Analytics page (click the 'Analytics' navigation item) so the individual report view and date range controls can be selected.
        # "analytics
Analytics"
        elem = page.locator("xpath=/html/body/div[2]/aside/nav/div[3]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Switch to the Individual Report view and select the section '2nd Year DAIML'. After the page updates, set the desired date range and click Generate Insights.
        # button "Individual Report"
        elem = page.locator("xpath=/html/body/div[2]/main/div/div[2]/button[2]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Open the 'Choose Student' dropdown (index 440). After the UI updates, observe whether date range inputs and the Generate/Insights button appear.
        # "Select Student
ADITYA B L (8360201)
ANJA..."
        elem = page.locator("xpath=/html/body/div[2]/main/div/div[4]/div/div[2]/select").nth(0)
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
    