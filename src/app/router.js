/**
 * Meme Foundry - Application Router
 * Manages application views and navigation
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';

class Router extends EventEmitter {
  constructor(state) {
    super();
    this.logger = new Logger('Router');
    this.state = state;
    
    // Route definitions
    this.routes = new Map();
    
    // Current route
    this.currentRoute = null;
    this.previousRoute = null;
    
    // History
    this.history = [];
    this.maxHistory = 20;
    
    // Route guards
    this.guards = [];
    
    // Default route
    this.defaultRoute = 'editor';
    
    // Route parameters
    this.params = {};
    this.query = {};
  }

  /**
   * Initialize router
   */
  initialize() {
    this.logger.info('Initializing router');
    
    // Register default routes
    this.registerDefaultRoutes();
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (event.state?.route) {
        this.navigateTo(event.state.route, { 
          params: event.state.params,
          query: event.state.query,
          replace: true,
          silent: false 
        });
      }
    });
    
    // Navigate to initial route
    const initialRoute = this.getRouteFromURL() || this.defaultRoute;
    this.navigateTo(initialRoute, { replace: true });
  }

  /**
   * Register default application routes
   */
  registerDefaultRoutes() {
    this.register('editor', {
      title: 'Editor',
      component: 'EditorUI',
      path: '/editor'
    });
    
    this.register('projects', {
      title: 'My Projects',
      component: 'ProjectsBrowser',
      path: '/projects'
    });
    
    this.register('settings', {
      title: 'Settings',
      component: 'SettingsPanel',
      path: '/settings'
    });
    
    this.register('help', {
      title: 'Help & Shortcuts',
      component: 'HelpPanel',
      path: '/help'
    });
    
    this.register('about', {
      title: 'About',
      component: 'AboutPanel',
      path: '/about'
    });
    
    this.register('export', {
      title: 'Export',
      component: 'ExportDialog',
      path: '/export'
    });
  }

  /**
   * Register a route
   */
  register(name, config) {
    this.routes.set(name, {
      ...config,
      name
    });
  }

  /**
   * Navigate to route
   */
  async navigateTo(routeName, options = {}) {
    const {
      params = {},
      query = {},
      replace = false,
      silent = false
    } = options;
    
    const route = this.routes.get(routeName);
    
    if (!route) {
      this.logger.warn(`Route not found: ${routeName}`);
      return false;
    }
    
    // Check guards
    for (const guard of this.guards) {
      const canActivate = await guard(route, this.currentRoute);
      if (!canActivate) {
        this.emit('route:blocked', { route, guard });
        return false;
      }
    }
    
    // Store previous route
    this.previousRoute = this.currentRoute;
    
    // Update current route
    this.currentRoute = route;
    this.params = params;
    this.query = query;
    
    // Add to history
    if (!silent) {
      this.history.push({
        route: routeName,
        params,
        query,
        timestamp: Date.now()
      });
      
      // Limit history
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      // Update browser URL
      const url = this.buildURL(route, params, query);
      
      if (replace) {
        window.history.replaceState(
          { route: routeName, params, query },
          route.title,
          url
        );
      } else {
        window.history.pushState(
          { route: routeName, params, query },
          route.title,
          url
        );
      }
      
      // Update document title
      document.title = `${route.title} - Meme Foundry`;
    }
    
    // Emit event
    this.emit('route:changed', {
      route,
      previousRoute: this.previousRoute,
      params,
      query
    });
    
    this.state.setState('app.currentRoute', routeName);
    
    this.logger.debug(`Navigated to: ${routeName}`);
    
    return true;
  }

  /**
   * Navigate back
   */
  goBack() {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current
      const previous = this.history.pop(); // Get previous
      
      if (previous) {
        this.navigateTo(previous.route, {
          params: previous.params,
          query: previous.query,
          replace: true
        });
        return true;
      }
    }
    
    return false;
  }

  /**
   * Build URL from route
   */
  buildURL(route, params = {}, query = {}) {
    let url = route.path;
    
    // Replace path params
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }
    
    // Add query string
    const queryPairs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    
    if (queryPairs.length > 0) {
      url += '?' + queryPairs.join('&');
    }
    
    return url;
  }

  /**
   * Get route from current URL
   */
  getRouteFromURL() {
    const pathname = window.location.pathname;
    
    for (const [name, route] of this.routes) {
      const pattern = this.pathToRegex(route.path);
      if (pattern.test(pathname)) {
        return name;
      }
    }
    
    return null;
  }

  /**
   * Convert path to regex
   */
  pathToRegex(path) {
    const pattern = path
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Parse query string
   */
  parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const query = {};
    
    for (const [key, value] of params) {
      query[key] = value;
    }
    
    return query;
  }

  /**
   * Add route guard
   */
  addGuard(guard) {
    this.guards.push(guard);
    return () => {
      const index = this.guards.indexOf(guard);
      if (index > -1) this.guards.splice(index, 1);
    };
  }

  /**
   * Check if route is active
   */
  isActive(routeName) {
    return this.currentRoute?.name === routeName;
  }

  /**
   * Get current route info
   */
  getCurrentRoute() {
    if (!this.currentRoute) return null;
    
    return {
      name: this.currentRoute.name,
      title: this.currentRoute.title,
      path: this.currentRoute.path,
      params: this.params,
      query: this.query
    };
  }

  /**
   * Get route by name
   */
  getRoute(name) {
    return this.routes.get(name) || null;
  }

  /**
   * Get all registered routes
   */
  getRoutes() {
    return Array.from(this.routes.values());
  }

  /**
   * Get navigation history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Reload current route
   */
  reload() {
    if (this.currentRoute) {
      this.navigateTo(this.currentRoute.name, {
        params: this.params,
        query: this.query,
        replace: true
      });
    }
  }

  /**
   * Check if navigation is possible
   */
  canGoBack() {
    return this.history.length > 1;
  }

  /**
   * Destroy
   */
  destroy() {
    this.routes.clear();
    this.guards = [];
    this.history = [];
    this.removeAllListeners();
  }
}

export { Router };