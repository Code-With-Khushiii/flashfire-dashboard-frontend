import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login.tsx';
import Register from './components/Register.tsx';
import MainContent from './components/MainContent.tsx';

import { UserJobsProvider } from './state_management/UserJobs.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProfileProvider } from './state_management/ProfileContext.tsx';
import ProfilePage from './components/Profile.tsx';
import Navigation from './components/Navigation.tsx';
import NewUserModal from './components/NewUserModal.tsx';
import ManagePage from './components/Operations/Manage.tsx';
import Optimizer from './components/AiOprimizer/Optimizer.tsx';
import Inbox from './components/Inbox.tsx';
import { PostHogSessionControl } from './components/PostHogSessionControl.tsx';

// Component to handle Profile page with proper navigation
function ProfileWithNavigation() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // Don't show modal on profile page - user explicitly navigated here to view/edit
  const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        setUserProfileFormVisibility={setUserProfileFormVisibility}
      />
      <div className="md:ml-56">
        <ProfilePage />
        {userProfileFormVisibility && (
          <NewUserModal
            setUserProfileFormVisibility={setUserProfileFormVisibility}
            onProfileComplete={() => {
              console.log("Profile completed callback triggered in App");
              setUserProfileFormVisibility(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function InboxWithNavigation() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        setUserProfileFormVisibility={setUserProfileFormVisibility}
      />
      <div className="md:ml-56">
        <Inbox />
        {userProfileFormVisibility && (
          <NewUserModal
            setUserProfileFormVisibility={setUserProfileFormVisibility}
            onProfileComplete={() => setUserProfileFormVisibility(false)}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
      <GoogleOAuthProvider
          clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}
      >
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
              },
              success: {
                style: {
                  background: '#10B981',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#EF4444',
                },
              },
              loading: {
                style: {
                  background: '#3B82F6',
                },
              },
            }}
          />
          <Router>
              {(import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_PUBLIC_POSTHOG_KEY) ? <PostHogSessionControl /> : null}
              <Routes>
                  {/* Public routes */}
                  <Route
                      path="/login"
                      element={
                          <UserProfileProvider>
                              <Login />
                          </UserProfileProvider>
                      }
                  />
                  <Route
                      path="/coreops"
                      element={
                          <UserProfileProvider>
                              <Register />
                          </UserProfileProvider>
                      }
                  />

                  {/* Routes that require UserJobsProvider */}
                  <Route
                      path="/"
                      element={
                          <UserJobsProvider>
                              <UserProfileProvider>
                                  <MainContent />
                              </UserProfileProvider>
                          </UserJobsProvider>
                      }
                  />
                  <Route
                      path="/manage"
                      element={
                          <UserProfileProvider>
                              <ManagePage />
                          </UserProfileProvider>
                      }
                  />
                  <Route
                      path="/operations/manage"
                      element={
                          <UserProfileProvider>
                              <ManagePage />
                          </UserProfileProvider>
                      }
                  />
                  <Route
                      path="/optimize/:jobId"
                      element={
                          <UserJobsProvider>
                              <UserProfileProvider>
                                  <Optimizer />
                              </UserProfileProvider>
                          </UserJobsProvider>
                      }
                  />
                  <Route
                      path="/profile"
                      element={
                          <UserJobsProvider>
                              <UserProfileProvider>
                                  <ProfileWithNavigation />
                              </UserProfileProvider>
                          </UserJobsProvider>
                      }
                  />
                  <Route
                      path="/inbox"
                      element={
                          <UserJobsProvider>
                              <UserProfileProvider>
                                  <InboxWithNavigation />
                              </UserProfileProvider>
                          </UserJobsProvider>
                      }
                  />
              </Routes>
          </Router>
      </GoogleOAuthProvider>
  );
}

export default App;
