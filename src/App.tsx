import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { SettingsProvider } from './lib/SettingsContext';
import Home from './pages/Home';
import Services from './pages/Services';
import Portfolio from './pages/Portfolio';
import Order from './pages/Order';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/Login';
import AdminOverview from './pages/admin/Overview';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminCustomers from './pages/admin/Customers';
import AdminPortfolio from './pages/admin/PortfolioAdmin';
import AdminServices from './pages/admin/ServicesAdmin';
import AdminTestimonials from './pages/admin/TestimonialsAdmin';
import AdminSettings from './pages/admin/SettingsAdmin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <SettingsProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="order" element={<Order />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:ref" element={<AdminOrderDetail />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="portfolio" element={<AdminPortfolio />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </SettingsProvider>
  );
}
