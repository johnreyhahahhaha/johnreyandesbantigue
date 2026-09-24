import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const BrandingContext = createContext();
const API_BASE_URL = 'http://165.22.181.147/api';

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    parish_name: 'St. Joseph Parish',
    parish_address: '',
    parish_logo: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch branding on component mount
  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/get_branding.php`);
      if (response.data.success && response.data.data) {
        setBranding(response.data.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching branding:', err);
      setError(err.message);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('parish_name', data.parish_name);
      formData.append('parish_address', data.parish_address);
      if (data.parish_logo_file) {
        formData.append('parish_logo', data.parish_logo_file);
      }
      if (data.user_id) {
        formData.append('user_id', data.user_id);
      }

      // axios will automatically set the proper Content-Type including boundary
      // if we manually specify 'multipart/form-data' the boundary is omitted and PHP
      // won't populate $_FILES.  Removing header fixes file uploads.
      const response = await axios.post(`${API_BASE_URL}/update_branding.php`, formData);

      if (response.data.success) {
        setBranding(response.data.data);
        setError(null);
        return response.data;
      } else {
        setError(response.data.message || 'Failed to update branding');
        return response.data;
      }
    } catch (err) {
      console.error('Error updating branding:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, error, fetchBranding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};
