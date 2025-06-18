import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';
import { SocketProvider } from './contexts/SocketProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <Auth0Provider
    domain="dev-tdzbygdhn8ttrngf.us.auth0.com"
    clientId="LoeDh7PO9rPTmcdtA8odAEqKZtNPTTJ9"
    authorizationParams={{
      redirect_uri: "https://192.168.29.89:5173/home"
    }}
  >
    <SocketProvider>
      <App />
    </SocketProvider>
  </Auth0Provider>,
  /* </React.StrictMode> */
); 