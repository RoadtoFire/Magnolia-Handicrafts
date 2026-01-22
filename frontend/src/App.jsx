import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Hero from './components/Hero'; // 1. Import Hero
import ProductGallery from './components/ProductGallery';
import ProductDetail from './components/ProductDetail';
import Checkout from './components/Checkout';
import OrderSuccess from './components/OrderSuccess';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';

// Helper component to only show Hero on Home Page
function MainContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex-1">
      {/* 2. Show Hero only on Home Page */}
      {isHomePage && <Hero />}
      
      <Routes>
        <Route path="/" element={<ProductGallery />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-stone-50 flex flex-col font-sans relative">
          <Header />
          <MainContent />
          <Footer />
          <CartDrawer />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;