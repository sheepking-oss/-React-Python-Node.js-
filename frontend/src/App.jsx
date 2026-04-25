import React, { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Search from './pages/Search';
import JobDetail from './pages/JobDetail';
import Favorites from './pages/Favorites';
import Comparison from './pages/Comparison';
import Analysis from './pages/Analysis';
import Dashboard from './pages/Dashboard';

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  页面不存在
                </h2>
                <p className="text-gray-500 mb-6">
                  您访问的页面不存在或已被移除
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 btn-primary"
                >
                  返回首页
                </a>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
