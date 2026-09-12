from typing import List
from playwright.async_api import Page
from .models import FormElement, SelectOption
from .detector import classify_control, is_submit_control

COLLECT_ELEMENTS_SCRIPT = """
(() => {
  const selector = 'input, select, textarea, button, [role="button"], [contenteditable="true"]';
  const allNodes = Array.from(document.querySelectorAll(selector));

  // Filter out hidden inputs and elements with display:none or visibility:hidden
  const nodes = allNodes.filter((node) => {
    if (node.type === 'hidden') return false;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  });

  window.__agentElements = nodes;

  function labelFor(node) {
    if (node.labels && node.labels.length) {
      const txt = Array.from(node.labels).map((l) => l.innerText.trim()).join(' ');
      if (txt) return txt;
    }
    if (node.id) {
      const forLabel = document.querySelector('label[for="' + CSS.escape(node.id) + '"]');
      if (forLabel && forLabel.innerText) return forLabel.innerText.trim();
    }
    const parentLabel = node.closest('label');
    if (parentLabel && parentLabel.innerText) {
      return parentLabel.innerText.trim();
    }
    if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
    if (node.getAttribute('aria-labelledby')) {
      const labelledNode = document.getElementById(node.getAttribute('aria-labelledby'));
      if (labelledNode && labelledNode.innerText) return labelledNode.innerText.trim();
    }
    if (node.placeholder) return node.placeholder;
    if (node.name) return node.name;
    if (node.tagName === 'BUTTON' && node.innerText) return node.innerText.trim();
    const prev = node.previousElementSibling;
    if (prev && prev.innerText) return prev.innerText.trim();
    if (node.innerText) return node.innerText.trim();
    return '';
  }

  function getLegend(node) {
    const fieldset = node.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return legend.innerText.trim();
    }
    return '';
  }

  return nodes.map((node, index) => {
    let options = [];
    let selectedOptionText = '';
    let selectedOptionValue = '';

    if (node.tagName === 'SELECT') {
      options = Array.from(node.options).map((o) => ({ text: o.text.trim(), value: o.value }));
      if (node.selectedIndex >= 0 && node.options[node.selectedIndex]) {
        selectedOptionText = node.options[node.selectedIndex].text.trim();
        selectedOptionValue = node.options[node.selectedIndex].value;
      }
    }

    let currentValue = '';
    if (node.tagName === 'SELECT') {
      currentValue = selectedOptionText || selectedOptionValue || node.value || '';
    } else if (node.type === 'checkbox' || node.type === 'radio') {
      currentValue = String(Boolean(node.checked));
    } else {
      currentValue = node.value ?? node.innerText ?? '';
    }

    return {
      elementIndex: index,
      tagName: node.tagName.toLowerCase(),
      type: node.type || '',
      id: node.id || '',
      name: node.name || '',
      placeholder: node.placeholder || '',
      disabled: Boolean(node.disabled),
      required: Boolean(node.required || node.getAttribute('aria-required') === 'true'),
      label: labelFor(node).slice(0, 200),
      legend: getLegend(node),
      currentValue,
      checked: (node.type === 'checkbox' || node.type === 'radio') ? Boolean(node.checked) : false,
      options,
      selectedText: selectedOptionText,
      selectedValue: selectedOptionValue,
    };
  });
})();
"""

INJECT_SET_OF_MARKS_SCRIPT = """
(() => {
  document.querySelectorAll('.__agent-som-badge').forEach((el) => el.remove());

  const elements = window.__agentElements || [];
  elements.forEach((el, index) => {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const badge = document.createElement('div');
      badge.className = '__agent-som-badge';
      badge.textContent = index;
      badge.style.position = 'absolute';
      badge.style.left = (window.scrollX + rect.left + 2) + 'px';
      badge.style.top = (window.scrollY + rect.top - 10) + 'px';
      badge.style.backgroundColor = '#10b981';
      badge.style.color = '#ffffff';
      badge.style.fontSize = '10px';
      badge.style.fontWeight = 'bold';
      badge.style.fontFamily = 'monospace';
      badge.style.padding = '1px 4px';
      badge.style.borderRadius = '3px';
      badge.style.zIndex = '999999';
      badge.style.pointerEvents = 'none';
      badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      document.body.appendChild(badge);
    } catch (_) {}
  });
})();
"""

async def inspect_page(page: Page) -> List[FormElement]:
    """Inspects a Playwright page and returns all detected interactive elements."""
    raw_elements = await page.evaluate(COLLECT_ELEMENTS_SCRIPT)
    try:
        await page.evaluate(INJECT_SET_OF_MARKS_SCRIPT)
    except Exception:
        pass

    elements: List[FormElement] = []
    for raw in raw_elements:
        opts = [SelectOption(value=o.get("value", ""), text=o.get("text", "")) for o in raw.get("options", [])]
        el = FormElement(
            elementIndex=raw["elementIndex"],
            tagName=raw["tagName"],
            type=raw["type"],
            classification=classify_control(raw),
            id=raw["id"],
            name=raw["name"],
            label=raw["label"],
            placeholder=raw["placeholder"],
            required=raw["required"],
            disabled=raw["disabled"],
            currentValue=raw["currentValue"],
            checked=raw["checked"],
            selectedText=raw["selectedText"],
            selectedValue=raw["selectedValue"],
            options=opts,
            isSubmit=is_submit_control(raw),
        )
        elements.append(el)

    return elements
