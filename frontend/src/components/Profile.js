import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem("user");
  const userData = user && user !== "undefined" ? JSON.parse(user) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    mobile: userData?.mobile || "",
    vehicleType: userData?.vehicleType || "",
  });
const menuRef = useRef();

useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);


  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("lastPage");
    navigate("/");
  };
  
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action is irreversible."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("Your account has been deleted.");
        handleLogout();
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete Account Error:", error);
      alert("An error occurred. Please try again later.");
    }
  };

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");

  const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/updateProfile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatedUserData),
  });

if (response.ok) {
  const updatedUser = await response.json();

  localStorage.setItem("user", JSON.stringify(updatedUser.user));
  setUpdatedUserData({
    name: updatedUser.user.name,
    mobile: updatedUser.user.mobile,
    vehicleType: updatedUser.user.vehicleType,
  });

  setIsEditing(false); // Exit edit mode
  setMenuOpen(false);  // Close menu

  navigate("/profile"); // Redirect back to profile page view
} else {
  alert("Failed to update profile. Please try again.");
}


};


  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
      </div>

      <div style={styles.page}>
        <div style={styles.headerContainer}>
          <h2 style={styles.title}>My Profile</h2>
          <div style={styles.menuWrapper}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
              <svg width="24" height="45" fill="#011F26" viewBox="0 0 24 45">
                <circle cx="5" cy="25" r="2"/>
                <circle cx="12" cy="25" r="2"/>
                <circle cx="19" cy="25" r="2"/>
              </svg>
            </button>
            {menuOpen && (
              <div ref={menuRef} style={styles.dropdown}>
                <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} style={styles.dropdownItem}>
                  Edit Profile
                </button>       
                <button onClick={handleLogout} style={{...styles.dropdownItem}}>
                  Logout
                </button>
                <button onClick={handleDeleteAccount} style={{...styles.dropdownItem, color:"#ff4d4d"}}>
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.profileIconContainer}>
          <div style={styles.profileCircle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" stroke="#fff" viewBox="0 0 24 24">
              <path fill="#011F26" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        </div>

        {userData ? (
          <>
            {isEditing ? (
              <form onSubmit={handleProfileUpdate} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Name:</label>
                  <input
                    type="text"
                    value={updatedUserData.name}
                    onChange={(e) =>
                      setUpdatedUserData({ ...updatedUserData, name: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Mobile:</label>
                  <input
                    type="text"
                    value={updatedUserData.mobile}
                    onChange={(e) =>
                      setUpdatedUserData({ ...updatedUserData, mobile: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Vehicle Type:</label>
                  <input
                    type="text"
                    value={updatedUserData.vehicleType}
                    onChange={(e) =>
                      setUpdatedUserData({ ...updatedUserData, vehicleType: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>
                <button type="submit" style={styles.updateButton}>Save Changes</button>
                <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelButton}>
                  Cancel
                </button>
              </form>
            ) : (
              <div style={styles.cardContainer}>
                <div style={styles.infoCard}><span style={styles.cardLabel}>Name</span><span style={styles.cardValue}>{userData.name}</span></div>
                <div style={styles.infoCard}><span style={styles.cardLabel}>Email</span><span style={styles.cardValue}>{userData.email}</span></div>
                <div style={styles.infoCard}><span style={styles.cardLabel}>Mobile</span><span style={styles.cardValue}>{userData.mobile}</span></div>
                <div style={styles.infoCard}><span style={styles.cardLabel}>Vehicle</span><span style={styles.cardValue}>{userData.vehicleType || "Not provided"}</span></div>
              </div>
            )}       
          </>
        ) : (
          <p style={styles.noUser}>No user data found</p>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <button onClick={() => navigate("/sessions")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9v8l9-12h-9z"/>
            </svg>
            <span style={styles.buttonText}>Sessions</span>
          </div>
        </button>

        <button onClick={() => navigate("/home")} className="scan-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span style={{ ...styles.buttonText, color: "#fff" }}>Home</span>
          </div>
        </button>

        <button onClick={() => navigate("/profile")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#04BFBF" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            <span style={{ ...styles.buttonText, color: "#04BFBF"}}>Profile</span>
          </div>
        </button>
      </div>
    </>
  );
};

const styles = {
  page: {
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 16px 24px 16px",
    minHeight: "calc(100vh - 100px)",
    fontFamily: "Orbitron, sans-serif",
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    marginBottom: "12px",
    marginTop: "20px",
  },
  title: {
    color: "#011F26",
    textAlign: "center",
    fontSize: "26px",
    letterSpacing: "1.2px",
  },
  menuWrapper: { position: "absolute", right: "16px", top: "0" },
  menuButton: { background: "transparent", border: "none", cursor: "pointer", padding: "4px" },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "28px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 10,
    minWidth: "120px",
  },
  dropdownItem: {
    padding: "10px",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#011F26",
    borderBottom: "1px solid #eee",
  },
  profileIconContainer: { marginBottom: "24px" },
  profileCircle: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    backgroundColor: "#d7f2f7",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  infoCard: {
    backgroundColor: "#f7f9fa",
    borderRadius: "12px",
    padding: "14px 16px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  cardLabel: { color: "#555", fontSize: "13px", marginBottom: "4px" },
  cardValue: { color: "#011F26", fontSize: "16px", fontWeight: "600" },
  inputGroup: { marginBottom: "16px", width: "100%", maxWidth: "420px" },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    border: "1px solid #00fff7",
    borderRadius: "10px",
    background: "#f9f9f9",
    color: "#111",
  },
  form: { display: "flex", flexDirection: "column", alignItems: "center" },
  updateButton: {
    marginTop: "20px",
    padding: "12px",
    fontSize: "15px",
    background: "#00fff7",
    color: "#111",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: "10px",
    padding: "12px",
    fontSize: "15px",
    background: "#eee",
    color: "#111",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  logoutButton: {
    marginTop: "24px",
    padding: "12px",
    background: "transparent",
    color: "#00fff7",
    border: "1px solid #00fff7",
    borderRadius: "12px",
    cursor: "pointer",
  },
  noUser: { color: "#888", textAlign: "center", fontSize: "14px" },
  buttonText: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "9px",
    marginTop: "4px",
    color: "#cdebf5",
  },
};

export default Profile;
