import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import PhoneInput from 'react-phone-input-2';
import axios from 'axios';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from 'firebase/auth';
import './EditProfile.css';

const API = process.env.REACT_APP_API;

const EditProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    photoURL: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [originalPhone, setOriginalPhone] = useState('');
  const [isPhoneChanged, setIsPhoneChanged] = useState(false);
  const [changeCounters, setChangeCounters] = useState({ email: 0, phoneNumber: 0 });

  useEffect(() => {
    fetchUserData();
  }, [uid]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API}/users/${uid}`);
      setFormData(response.data);
      setOriginalPhone(response.data.phoneNumber);
      setChangeCounters(response.data.changeCounters || { email: 0, phoneNumber: 0 });
      setLoading(false);
    } catch (err) {
      setError('Error fetching user data');
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    const newPhone = `+${value}`;
    setFormData(prev => ({ ...prev, phoneNumber: newPhone }));
    setIsPhoneChanged(newPhone !== originalPhone);
    setIsPhoneVerified(false);
  };

  const sendOTP = async () => {
    if (!formData.phoneNumber) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formData.phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsVerifying(true);
      setTimer(60);
      setSuccessMessage('OTP sent successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error sending OTP. Please try again.');
      console.error('Error sending OTP:', err);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    try {
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
      await linkWithCredential(auth.currentUser, credential);
      setIsPhoneVerified(true);
      setIsVerifying(false);
      setSuccessMessage('Phone number verified successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      console.error('Error verifying OTP:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const storageRef = ref(storage, `profile-photos/${uid}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        null,
        (error) => setError('Error uploading file'),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, photoURL: downloadURL }));
        }
      );
    } catch (err) {
      setError('Error uploading file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isPhoneChanged && !isPhoneVerified) {
      setError('Please verify your new phone number before updating profile');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.patch(`${API}/users/${uid}`, formData);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        setTimeout(() => navigate(`/foodie`), 1000);
      }, 2000);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.join(", "));
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="Edit-Foodie-loading">Loading...</div>;

  return (
    <div className="Edit-Foodie-container">
      <h1 className="Edit-Foodie-title">Edit Profile</h1>
      {error && <div className="Edit-Foodie-error">{error}</div>}
      {successMessage && <div className="Edit-Foodie-success">{successMessage}</div>}
      
      <form onSubmit={handleSubmit} className="Edit-Foodie-form">
        <div className="Edit-Foodie-photo-section">
          <div 
            className={`Edit-Foodie-photo-container ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {formData.photoURL && (
              <img 
                src={formData.photoURL} 
                alt="Profile" 
                className="Edit-Foodie-profile-photo" 
              />
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e.target.files[0])} 
              className="Edit-Foodie-file-input"
            />
          </div>
          <div className="Edit-Foodie-photo-instructions">
            Click to edit or drop an image to change
          </div>
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Username</label>
          <input 
            type="text" 
            name="username" 
            value={formData.username} 
            onChange={handleInputChange} 
            required 
            className="Edit-Foodie-input" 
          />
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Email</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleInputChange} 
            required 
            className="Edit-Foodie-input" 
            disabled={changeCounters.email >= 1} 
          />
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Phone Number</label>
          <div className="Edit-Foodie-phone-section">
            <PhoneInput
              country={'in'}
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              inputClass="Edit-Foodie-phone-input"
              containerClass="Edit-Foodie-phone-container"
              disabled={changeCounters.phoneNumber >= 1} 
            />
            {isPhoneChanged && !isPhoneVerified && (
              <button
                type="button"
                onClick={sendOTP}
                className="Edit-Foodie-verify-btn"
                disabled={timer > 0}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : 'Verify Phone'}
              </button>
            )}
          </div>
        </div>

        {isVerifying && (
          <div className="Edit-Foodie-form-group">
            <label>Enter OTP</label>
            <div className="Edit-Foodie-otp-section">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="Edit-Foodie-input"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
              />
              <button
                type="button"
                onClick={verifyOTP}
                className="Edit-Foodie-verify-btn"
              >
                Verify OTP
              </button>
            </div>
          </div>
        )}

        <div className="Edit-Foodie-buttons">
          <button 
            type="submit" 
            className="Edit-Foodie-submit-btn"
            disabled={isSubmitting || (isPhoneChanged && !isPhoneVerified)}
          >
            Update Profile
          </button>
          <button 
            type="button" 
            className="Edit-Foodie-cancel-btn" 
            onClick={() => navigate('/foodie')}
          >
            Go Back
          </button>
        </div>
      </form>

      <div id="recaptcha-container"></div>
    </div>
  );
};

export default EditProfile;