from typing import Optional, List
from playwright.async_api import async_playwright, Playwright, Browser, BrowserContext, Page
from ..config import HEADLESS
from .models import FormSnapshot, FormElement
from .inspector import inspect_page

class BrowserSession:
    """Manages an active Playwright browser instance and page automation."""
    def __init__(self, headless: bool = HEADLESS):
        self.headless = headless
        self._pw: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.current_url: str = ""

    async def launch(self, target_url: str) -> Page:
        if self._pw is None:
            self._pw = await async_playwright().start()

        if self.browser is None:
            self.browser = await self._pw.chromium.launch(
                headless=self.headless,
                args=["--disable-blink-features=AutomationControlled"],
            )

        if self.context is None:
            self.context = await self.browser.new_context(
                viewport={"width": 1280, "height": 800}
            )

        if self.page is None:
            self.page = await self.context.new_page()

        self.current_url = target_url
        await self.page.goto(target_url, wait_until="domcontentloaded")
        return self.page

    async def read_form(self) -> FormSnapshot:
        if not self.page:
            raise RuntimeError("Browser session has not been launched.")
        elements = await inspect_page(self.page)
        return FormSnapshot(url=self.current_url, elements=elements)

    async def close(self) -> None:
        if self.page:
            try:
                await self.page.close()
            except Exception:
                pass
            self.page = None

        if self.context:
            try:
                await self.context.close()
            except Exception:
                pass
            self.context = None

        if self.browser:
            try:
                await self.browser.close()
            except Exception:
                pass
            self.browser = None

        if self._pw:
            try:
                await self._pw.stop()
            except Exception:
                pass
            self._pw = None
