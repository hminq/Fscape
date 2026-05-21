import { Routes, Route, Navigate, useParams } from "react-router-dom";
import ChatbotWidget from "./components/chatbot/ChatbotWidget";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/auth/AuthPage";
import BuildingDetailPage from "./pages/BuildingDetailPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import RoomBookingPage from "./pages/RoomBookingPage";
import RoomCheckoutPage from "./pages/RoomCheckoutPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import PaymentCheckoutPage from "./pages/PaymentCheckoutPage";
import RoomsPage from "./pages/RoomsPage";
import ContractSigningPage from "./pages/ContractSigningPage";
import ContractRenewalPage from "./pages/ContractRenewalPage";
import ProfilePage from "./pages/ProfilePage";
import MyRoomsPage from "./pages/MyRoomsPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import MyContractsPage from "./pages/MyContractsPage";
import MyInvoicesPage from "./pages/MyInvoicesPage";
import VerifyOtp from "./pages/auth/VerifyOtp";
function BuildingRoomsRedirect() {
  const { buildingId } = useParams();
  return <Navigate to={`/rooms?building_id=${buildingId}`} replace />;
}

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<><HomePage /><ChatbotWidget /></>} />
      <Route path="/login" element={<AuthPage initialTab="login" />} />
      <Route path="/forgot-password" element={<AuthPage initialTab="forgot" />} />
      <Route path="/rooms" element={<RoomsPage />} />
      <Route path="/buildings/:buildingId" element={<BuildingDetailPage />} />
      <Route path="/buildings/:buildingId/rooms" element={<BuildingRoomsRedirect />} />
      <Route path="/buildings/:buildingId/rooms/:roomId" element={<RoomDetailPage />} />
      <Route path="/buildings/:buildingId/rooms/:roomId/booking" element={<RoomBookingPage />} />
      <Route path="/buildings/:buildingId/rooms/:roomId/checkout" element={<RoomCheckoutPage />} />
      <Route path="/payment/checkout" element={<PaymentCheckoutPage />} />
      <Route path="/payment/result" element={<PaymentResultPage />} />
      <Route path="/sign" element={<ContractSigningPage />} />
      <Route path="/renew" element={<ContractRenewalPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/my-rooms" element={<MyRoomsPage />} />
      <Route path="/my-bookings" element={<MyBookingsPage />} />
      <Route path="/my-contracts" element={<MyContractsPage />} />
      <Route path="/my-invoices" element={<MyInvoicesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
    </Routes>
    </>
  );
}

export default App;
