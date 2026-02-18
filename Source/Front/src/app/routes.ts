import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Event } from './pages/Event';
import { Preferences } from './pages/Preferences';
import { Wishlist } from './pages/Wishlist';
import { PrivateRoute } from './components/PrivateRoute';
import { Navigate } from 'react-router';
import { createElement } from 'react';

export const router = createBrowserRouter([
  {
    path: '/',
    element: createElement(Navigate, { to: '/login', replace: true })
  },
  {
    path: '/login',
    Component: Login
  },
  {
    path: '/event',
    element: createElement(PrivateRoute, null, createElement(Event))
  },
  {
    path: '/preferences',
    element: createElement(PrivateRoute, null, createElement(Preferences))
  },
  {
    path: '/wishlist',
    element: createElement(PrivateRoute, null, createElement(Wishlist))
  },
  {
    path: '*',
    element: createElement(Navigate, { to: '/login', replace: true })
  }
]);
