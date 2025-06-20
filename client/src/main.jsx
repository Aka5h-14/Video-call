import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';
import { SocketProvider } from './contexts/SocketProvider';

const Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const DomainApi = import.meta.env.VITE_AUTH0_DOMAIN_API;

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <Auth0Provider
    domain={Domain}
    clientId={ClientId}
    authorizationParams={{
      redirect_uri: "https://192.168.29.89:5173/home",
      audience: DomainApi,
      scope: "openid profile email read:current_user"
    }}
  >
    <SocketProvider>
      <App />
    </SocketProvider>
  </Auth0Provider>,
  /* </React.StrictMode> */
); 