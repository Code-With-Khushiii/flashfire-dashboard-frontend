import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, CheckCircle, CreditCard, Users } from 'lucide-react';
import { toastUtils, toastMessages } from '../utils/toast';
// import { GoogleLogin } from '@react-oauth/google';


const Register = () => {
  // State management for form data and UI interactions
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    planType: 'Free Trial',
    dashboardManager: ''
  });
  let [response, setResponse] = useState<{message?: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dashboardManagers, setDashboardManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const navigate = useNavigate();
  
  // Plan options
  const planOptions = [
    { value: 'Free Trial', label: 'Free Trial', description: 'Basic features to get started' },
    { value: 'Ignite', label: 'Ignite', description: 'Perfect for job seekers starting their journey' },
    { value: 'Professional', label: 'Professional', description: 'Advanced features for serious job seekers' },
    { value: 'Executive', label: 'Executive', description: 'Premium features for career advancement' }
  ];

  // Fetch dashboard managers on component mount
  useEffect(() => {
    const fetchDashboardManagers = async () => {
      try {
        setLoadingManagers(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${API_BASE_URL}/dashboard-managers`);
        const data = await response.json();
        
        if (data.success) {
          setDashboardManagers(data.data);
          // Set default manager if available
          if (data.data.length > 0 && !formData.dashboardManager) {
            setFormData(prev => ({
              ...prev,
              dashboardManager: data.data[0].fullName
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard managers:', error);
      } finally {
        setLoadingManagers(false);
      }
    };

    fetchDashboardManagers();
  }, []);

  
  // Handle input changes with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Basic form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.planType) newErrors.planType = 'Please select a plan';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastUtils.error(toastMessages.validationError);
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toastUtils.loading("Creating your account...");
    let name = formData.firstName + formData.lastName;
    // Simulate API call
     try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    console.log("API_BASE_URL:", API_BASE_URL);
    // console.log(name, mail, password);
      
    const res = await fetch(`${API_BASE_URL}/coreops`, {  //${API_BASE_URL}
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    console.log(data.message)
    setResponse(data);

    if (data?.message === 'User registered successfully') {
      toastUtils.dismissToast(loadingToast);
      toastUtils.success("Account created successfully! Please login to continue.");
      setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', planType: 'Free Trial', dashboardManager: '' });
      setErrors({});  
      navigate('/login');
    } else {
      toastUtils.dismissToast(loadingToast);
      toastUtils.error(data?.message || "Registration failed. Please try again.");
      setResponse(data);
    }

    // setName('');
    // setMail('');
    // setPassword('');
  } catch (error) {
    console.log("Registration failed:", error);
    toastUtils.dismissToast(loadingToast);
    toastUtils.error(toastMessages.networkError);
    setResponse({ message: 'Registration failed. Please try again.' });
  } finally {
    setIsLoading(false);
  }
}

  // Handle Google sign-in
  // const handleGoogleSignIn = () => {
  //   console.log('Google sign-in clicked');
  //   // Implement Google OAuth here
  // };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-orange-100/40 to-red-100/40 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content Container - Optimized for single screen */}
      <div className="relative flex min-h-screen items-center justify-center px-3 py-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md min-w-0">
          
          {/* Header Section - Reduced spacing */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 bg-orange-100 border border-orange-200 rounded-full px-3 py-1 mb-3">
              <CheckCircle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-800 text-xs font-medium">Join 10,000+ Job Seekers</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Create Your Account
            </h2>
            <p className="text-base text-gray-600">
              Start your journey to your dream job today
            </p>
          </div>

          {/* Signup Form Card - Reduced padding */}
          <div className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            
            {/* Google Sign-in Button - Smaller */}
            {/* <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 rounded-xl py-2.5 px-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm">Continue with Google</span>
            </button> */}
            {/* <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const res = await fetch("https://flashfire-dashboard-backend-zg4u.onrender.com/googleOAuth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: credentialResponse.credential })
                });
                const data = await res.json();
                console.log(data)
                if (data.token) {
                  setData({ userDetails: data.userDetails, token: data.token });
                  localStorage.setItem("userAuth",JSON.stringify({token : data?.token,userDetails : data?.userDetails}));
                  
                  navigate('/');
                } else {
                  setResponse({ message: data.message || 'Login failed' });
                }
  }}
  onError={() => console.log("Login Failed")}
  useOneTap
/> */}


            {/* Divider - Reduced margin */}
            {/* <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm mt-3">
                <span className="px-3 bg-white text-gray-500 text-xs">Or continue with email</span>
              </div>
            </div> */}

            {/* Registration Form - Reduced spacing */}
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Name Fields Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* First Name Input */}
                <div>
                  <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full min-w-0 rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name Input */}
                <div>
                  <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full min-w-0 rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full min-w-0 rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="john.doe@example.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Plan Selection */}
              <div>
                <label htmlFor="planType" className="block text-xs font-medium text-gray-700 mb-1">
                  Select Your Plan *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    id="planType"
                    name="planType"
                    value={formData.planType}
                    onChange={handleInputChange}
                    className={`w-full min-w-0 rounded-xl border bg-white py-2.5 pl-9 pr-8 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                      errors.planType ? 'border-red-500' : 'border-gray-200'
                    }`}
                  >
                    {planOptions.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label} - {plan.description}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.planType && <p className="text-red-500 text-xs mt-1">{errors.planType}</p>}
              </div>

              {/* Dashboard Manager Selection */}
              <div>
                <label htmlFor="dashboardManager" className="block text-xs font-medium text-gray-700 mb-1">
                  Dashboard Manager *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    id="dashboardManager"
                    name="dashboardManager"
                    value={formData.dashboardManager}
                    onChange={handleInputChange}
                    disabled={loadingManagers}
                    className={`w-full min-w-0 rounded-xl border bg-white py-2.5 pl-9 pr-8 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                      errors.dashboardManager ? 'border-red-500' : 'border-gray-200'
                    } ${loadingManagers ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {loadingManagers ? 'Loading managers...' : 'Select your dashboard manager'}
                    </option>
                    {dashboardManagers.map((manager: any) => (
                      <option key={manager._id} value={manager.fullName}>
                        {manager.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.dashboardManager && <p className="text-red-500 text-xs mt-1">{errors.dashboardManager}</p>}
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full min-w-0 rounded-xl border py-2.5 pl-9 pr-10 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full min-w-0 rounded-xl border py-2.5 pl-9 pr-10 text-sm transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start space-x-2 pt-1">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="terms" className="text-xs text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-4"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              {response?.message &&<p className='text-red-500'>{response?.message}</p>}
            </form>

            {/* Sign In Link - Reduced spacing */}
            <div className="text-center pt-4 border-t border-gray-100 mt-4">
             
              <Link to={'/login'}>
               <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                {/* <a href="#" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"> */}
                <span className= 'text-orange-500 font-bold'> Sign in here</span> 
                {/* </a> */}
              </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
