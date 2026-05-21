import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AdminLayout from "./layouts/AdminLayout";
import LoginPage from "./pages/LoginPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import DashboardPage from "./pages/DashboardPage";
import LocationsPage from "./pages/LocationsPage";
import UniversitiesPage from "./pages/UniversitiesPage";
import BuildingsPage from "./pages/BuildingsPage";
import BuildingStaffPage from "./pages/BuildingStaffPage";
import CreateBuildingPage from "./pages/CreateBuildingPage";
import RoomsPage from "./pages/RoomsPage";
import CreateRoomPage from "./pages/CreateRoomPage";
import EditRoomPage from "./pages/EditRoomPage";
import RoomTypesPage from "./pages/RoomTypesPage";
import AssetsPage from "./pages/AssetsPage";
import AssetTypesPage from "./pages/AssetTypesPage";
import AccountsPage from "./pages/AccountsPage";
import FacilitiesPage from "./pages/FacilitiesPage";

import CreateAssetPage from "./pages/CreateAssetPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import ContractsPage from "./pages/ContractsPage";
import ContractDetailPage from "./pages/ContractDetailPage";
import ContractTemplatesPage from "./pages/ContractTemplatesPage";
import ContractTemplateEditorPage from "./pages/ContractTemplateEditorPage";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import RequestsPage from "./pages/RequestsPage";
import RequestDetailPage from "./pages/RequestDetailPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import SystemLogsPage from "./pages/SystemLogsPage";
import BMLayout from "./layouts/BMLayout";
import BuildingManagerHomePage from "./pages/BuildingManagerHomePage";
import BMRoomsPage from "./pages/bm/BMRoomsPage";
import BMRoomDetailPage from "./pages/bm/BMRoomDetailPage";
import BMResidentsPage from "./pages/bm/BMResidentsPage";
import BMRequestsPage from "./pages/bm/BMRequestsPage";
import BMContractsPage from "./pages/bm/BMContractsPage";
import BMAssetsPage from "./pages/bm/BMAssetsPage";
import BMNotificationsPage from "./pages/bm/BMNotificationsPage";
import BMNotificationCreatePage from "./pages/bm/BMNotificationCreatePage";
import BMContractsPendingPage from "./pages/bm/BMContractsPendingPage";
import BMContractSignPage from "./pages/bm/BMContractSignPage";
import BMContractDetailPage from "./pages/bm/BMContractDetailPage";
import BMRequestAssignPage from "./pages/bm/BMRequestAssignPage";
import BMRequestDetailPage from "./pages/bm/BMRequestDetailPage";
import ProfilePage from "./pages/ProfilePage";
import BookingsPage from "./pages/BookingsPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import BMBookingsPage from "./pages/bm/BMBookingsPage";
import BMSettlementsPage from "./pages/bm/BMSettlementsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettlementsPage from "./pages/SettlementsPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          {/* BUILDING_MANAGER */}
          <Route element={<RoleRoute allowedRoles={["BUILDING_MANAGER"]} />}>
            <Route path="/building-manager" element={<BMLayout />}>
              <Route index element={<BuildingManagerHomePage />} />
              <Route path="rooms" element={<BMRoomsPage />} />
              <Route path="rooms/:id" element={<BMRoomDetailPage />} />
              <Route path="residents" element={<BMResidentsPage />} />
              <Route path="requests" element={<BMRequestsPage />} />
              <Route path="requests/assign" element={<BMRequestAssignPage />} />
              <Route path="requests/:id" element={<BMRequestDetailPage />} />
              <Route path="contracts" element={<BMContractsPage />} />
              <Route path="contracts/pending" element={<BMContractsPendingPage />} />
              <Route path="contracts/:id" element={<BMContractDetailPage />} />
              <Route path="contracts/:id/sign" element={<BMContractSignPage />} />
              <Route path="settlements" element={<BMSettlementsPage />} />
              <Route path="assets" element={<BMAssetsPage />} />
              <Route path="notifications" element={<BMNotificationsPage />} />
              <Route path="notifications/create" element={<BMNotificationCreatePage />} />
              <Route path="bookings" element={<BMBookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ADMIN */}
          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="accounts" element={<AccountsPage />} />

              <Route path="facilities" element={<FacilitiesPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="universities" element={<UniversitiesPage />} />
              <Route path="buildings" element={<BuildingsPage />} />
              <Route path="buildings/create" element={<CreateBuildingPage />} />
              <Route path="buildings/:id/staff" element={<BuildingStaffPage />} />
              <Route path="rooms">
                <Route index element={<RoomsPage />} />
                <Route path=":id" element={<RoomDetailPage />} />
                <Route path="create" element={<CreateRoomPage />} />
                <Route path=":id/edit" element={<EditRoomPage />} />
                <Route path="types" element={<RoomTypesPage />} />
              </Route>
              <Route path="assets" element={<AssetsPage />} />
              <Route path="assets/create" element={<CreateAssetPage />} />
              <Route path="assets/types" element={<AssetTypesPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="contracts/:id" element={<ContractDetailPage />} />
              <Route path="contracts/templates" element={<ContractTemplatesPage />} />
              <Route path="contracts/templates/create" element={<ContractTemplateEditorPage />} />
              <Route path="contracts/templates/:id/edit" element={<ContractTemplateEditorPage />} />
              <Route path="settlements" element={<SettlementsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="logs" element={<AuditLogsPage />} />
              <Route path="logs/system" element={<SystemLogsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
