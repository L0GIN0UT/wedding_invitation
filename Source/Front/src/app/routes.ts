import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Event } from './pages/Event';
import { Preferences } from './pages/Preferences';
import { Wishlist } from './pages/Wishlist';
import { Gallery } from './pages/Gallery';
import { PrivateRoute } from './components/PrivateRoute';
import { AUTH_ENABLED, PREFERENCES_ENABLED, WISHLIST_ENABLED } from './context/AuthContext';
import { Navigate } from 'react-router';
import { createElement } from 'react';

const homePath = AUTH_ENABLED ? '/login' : '/event';

export const router = createBrowserRouter([
  {
    path: '/',
    element: createElement(Navigate, { to: homePath, replace: true })
  },
  {
    path: '/login',
    ...(AUTH_ENABLED
      ? { Component: Login }
      : { element: createElement(Navigate, { to: '/event', replace: true }) })
  },
  {
    path: '/event',
    element: createElement(PrivateRoute, null, createElement(Event))
  },
  {
    path: '/preferences',
    ...(PREFERENCES_ENABLED
      ? { element: createElement(PrivateRoute, null, createElement(Preferences)) }
      : { element: createElement(Navigate, { to: '/event', replace: true }) })
  },
  {
    path: '/wishlist',
    ...(WISHLIST_ENABLED
      ? { element: createElement(PrivateRoute, { requireFriend: true }, createElement(Wishlist)) }
      : { element: createElement(Navigate, { to: '/event', replace: true }) })
  },
  {
    path: '/gallery',
    element: createElement(PrivateRoute, null, createElement(Gallery))
  },
  {
    path: '*',
    element: createElement(Navigate, { to: homePath, replace: true })
  }
]);
