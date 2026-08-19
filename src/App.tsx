import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import Seo from './components/seo/Seo'
import StructuredData from './components/seo/StructuredData'

const Home = lazy(() => import('./pages/Home'))
const Tools = lazy(() => import('./pages/Tools'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Admin = lazy(() => import('./pages/Admin'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const RequestToolService = lazy(() => import('./pages/RequestToolService'))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
const ProviderApplyPage = lazy(() => import('./pages/ProviderApplyPage'))
const ScammersPage = lazy(() => import('./pages/ScammersPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9ff] px-4">
      <div className="h-14 w-14 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-[#dfe6ff]" aria-label="Loading page" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Seo />
      <StructuredData />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/third-party/:id" element={<Tools />} />
          <Route path="/tools/:slug" element={<ProductDetail />} />
          <Route path="/categories" element={<Tools />} />
          <Route path="/categories/:slug" element={<Tools />} />
          <Route path="/scammers" element={<ScammersPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<LegalPage title="Terms & Conditions" />} />
          <Route path="/privacy" element={<LegalPage title="Privacy Policy" />} />
          <Route path="/refund-policy" element={<LegalPage title="Refund Policy" />} />
          <Route path="/disclaimer" element={<LegalPage title="Disclaimer" />} />
          <Route path="/providers" element={<ProviderApplyPage />} />
          <Route path="/become-provider" element={<ProviderApplyPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/request-tool-service" element={<RequestToolService />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/wallet" element={<Dashboard />} />
          <Route path="/dashboard/orders" element={<Dashboard />} />
          <Route path="/dashboard/support" element={<Dashboard />} />
          <Route path="/dashboard/scammer-reports" element={<Dashboard />} />
          <Route path="/dashboard/referrals" element={<Dashboard />} />
          <Route path="/dashboard/profile" element={<Dashboard />} />
          <Route path="/dashboard/provider" element={<Dashboard />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/admin/users" element={<Admin />} />
          <Route path="/admin/deposits" element={<Admin />} />
          <Route path="/admin/orders" element={<Admin />} />
          <Route path="/admin/pending-fulfillment" element={<Admin />} />
          <Route path="/admin/products" element={<Admin />} />
          <Route path="/admin/inventory" element={<Admin />} />
          <Route path="/admin/providers" element={<Admin />} />
          <Route path="/admin/requests" element={<Admin />} />
          <Route path="/admin/support" element={<Admin />} />
          <Route path="/admin/scammer-reports" element={<Admin />} />
          <Route path="/admin/logs" element={<Admin />} />
          <Route path="/admin/settings" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #dfe6ff',
            color: '#050816',
          },
        }}
      />
    </>
  )
}
