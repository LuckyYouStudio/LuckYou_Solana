import React from 'react';
import { WalletContextProvider } from './context/WalletContext';
import { LuckSnakeApp } from './components/LuckSnakeApp';
import './App.css';

function App() {
  return (
    <WalletContextProvider>
      <LuckSnakeApp />
    </WalletContextProvider>
  );
}

export default App;
