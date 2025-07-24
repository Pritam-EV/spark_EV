import axios from 'axios';

export const getDevices = () => axios.get(`${process.env.REACT_APP_Backend_API_Base_URL}/devices`);
export const saveSession = (sessionData) =>
    axios.post(`${process.env.REACT_APP_Backend_API_Base_URL}/sessions/start`, sessionData);
  
  export const endSession = (sessionData) =>
    axios.post(`${process.env.REACT_APP_Backend_API_Base_URL}/sessions/end`, sessionData);
  export const startSession = async (transactionId, deviceId) => {
    return fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, deviceId }),
    }).then(response => response.json());
  };
  