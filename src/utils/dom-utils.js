/**
 * Meme Foundry - DOM Utilities
 * Helper functions for DOM manipulation and element creation
 */

/**
 * Create HTML element with attributes and children
 */
export function createElement(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  
  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      element.addEventListener(event, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else if (key === 'html') {
      element.innerHTML = value;
    } else if (value !== undefined && value !== null) {
      element.setAttribute(key, value);
    }
  }
  
  // Append children
  for (const child of children) {
    if (child == null) continue;
    
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(c => {
        if (c instanceof Node) element.appendChild(c);
        else if (c != null) element.appendChild(document.createTextNode(c));
      });
    }
  }
  
  return element;
}

/**
 * Shorthand element creators
 */
export const el = {
  div: (...args) => createElement('div', ...args),
  span: (...args) => createElement('span', ...args),
  p: (...args) => createElement('p', ...args),
  a: (...args) => createElement('a', ...args),
  button: (...args) => createElement('button', ...args),
  input: (...args) => createElement('input', ...args),
  select: (...args) => createElement('select', ...args),
  option: (...args) => createElement('option', ...args),
  textarea: (...args) => createElement('textarea', ...args),
  label: (...args) => createElement('label', ...args),
  h1: (...args) => createElement('h1', ...args),
  h2: (...args) => createElement('h2', ...args),
  h3: (...args) => createElement('h3', ...args),
  h4: (...args) => createElement('h4', ...args),
  img: (...args) => createElement('img', ...args),
  canvas: (...args) => createElement('canvas', ...args),
  ul: (...args) => createElement('ul', ...args),
  li: (...args) => createElement('li', ...args),
  form: (...args) => createElement('form', ...args),
  table: (...args) => createElement('table', ...args),
  tr: (...args) => createElement('tr', ...args),
  td: (...args) => createElement('td', ...args),
  th: (...args) => createElement('th', ...args),
  section: (...args) => createElement('section', ...args),
  header: (...args) => createElement('header', ...args),
  footer: (...args) => createElement('footer', ...args),
  nav: (...args) => createElement('nav', ...args),
  main: (...args) => createElement('main', ...args),
  aside: (...args) => createElement('aside', ...args),
  article: (...args) => createElement('article', ...args),
  iframe: (...args) => createElement('iframe', ...args),
  video: (...args) => createElement('video', ...args),
  audio: (...args) => createElement('audio', ...args),
  source: (...args) => createElement('source', ...args),
  hr: (...args) => createElement('hr', ...args),
  br: () => createElement('br')
};

/**
 * Query selector shorthand
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query selector all shorthand
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Get element by ID
 */
export function getById(id) {
  return document.getElementById(id);
}

/**
 * Remove all children from element
 */
export function empty(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  return element;
}

/**
 * Set inner HTML safely
 */
export function setHTML(element, html) {
  element.innerHTML = html;
  return element;
}

/**
 * Set text content
 */
export function setText(element, text) {
  element.textContent = text;
  return element;
}

/**
 * Add class to element
 */
export function addClass(element, ...classes) {
  element.classList.add(...classes);
  return element;
}

/**
 * Remove class from element
 */
export function removeClass(element, ...classes) {
  element.classList.remove(...classes);
  return element;
}

/**
 * Toggle class on element
 */
export function toggleClass(element, className, force) {
  element.classList.toggle(className, force);
  return element;
}

/**
 * Check if element has class
 */
export function hasClass(element, className) {
  return element.classList.contains(className);
}

/**
 * Set CSS style
 */
export function setStyle(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

/**
 * Get computed style
 */
export function getStyle(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Set multiple attributes
 */
export function setAttributes(element, attributes) {
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

/**
 * Get element position relative to document
 */
export function getOffset(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Get element position relative to viewport
 */
export function getRect(element) {
  return element.getBoundingClientRect();
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element, offset = 0) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top + offset < window.innerHeight &&
    rect.bottom - offset > 0 &&
    rect.left + offset < window.innerWidth &&
    rect.right - offset > 0
  );
}

/**
 * Scroll element into view
 */
export function scrollIntoView(element, options = {}) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    ...options
  });
}

/**
 * Get closest parent matching selector
 */
export function closest(element, selector) {
  return element.closest(selector);
}

/**
 * Get next sibling element
 */
export function nextSibling(element, selector = null) {
  let sibling = element.nextElementSibling;
  if (!selector) return sibling;
  
  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.nextElementSibling;
  }
  return null;
}

/**
 * Get previous sibling element
 */
export function prevSibling(element, selector = null) {
  let sibling = element.previousElementSibling;
  if (!selector) return sibling;
  
  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.previousElementSibling;
  }
  return null;
}

/**
 * Insert element after reference
 */
export function insertAfter(newElement, referenceElement) {
  referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
  return newElement;
}

/**
 * Insert element before reference
 */
export function insertBefore(newElement, referenceElement) {
  referenceElement.parentNode.insertBefore(newElement, referenceElement);
  return newElement;
}

/**
 * Wrap element with wrapper
 */
export function wrap(element, wrapper) {
  element.parentNode.insertBefore(wrapper, element);
  wrapper.appendChild(element);
  return wrapper;
}

/**
 * Unwrap element (remove parent, keep element)
 */
export function unwrap(element) {
  const parent = element.parentNode;
  parent.parentNode.insertBefore(element, parent);
  parent.remove();
  return element;
}

/**
 * Delegate event listener
 */
export function delegate(parent, eventType, selector, handler) {
  parent.addEventListener(eventType, (event) => {
    const target = event.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, event, target);
    }
  });
}

/**
 * Trigger custom event
 */
export function trigger(element, eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail
  });
  element.dispatchEvent(event);
  return event;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = createElement('textarea', { value: text });
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * Download file
 */
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = createElement('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open file dialog
 */
export function openFileDialog(accept = '*/*', multiple = false) {
  return new Promise((resolve) => {
    const input = createElement('input', {
      type: 'file',
      accept,
      multiple,
      style: { display: 'none' },
      onChange: (e) => {
        const files = multiple ? Array.from(e.target.files) : [e.target.files[0]];
        resolve(files.filter(Boolean));
        document.body.removeChild(input);
      }
    });
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Create debounced resize observer
 */
export function observeResize(element, callback) {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      callback(entry.contentRect);
    }
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Create mutation observer
 */
export function observeMutations(element, callback, options = {}) {
  const observer = new MutationObserver(callback);
  observer.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    ...options
  });
  return () => observer.disconnect();
}

/**
 * Measure text width
 */
export function measureTextWidth(text, font) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Parse HTML string to element
 */
export function parseHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}