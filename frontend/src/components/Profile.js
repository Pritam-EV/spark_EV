import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const Profile = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem("user");
  const userData = user && user !== "undefined" ? JSON.parse(user) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    mobile: userData?.mobile || "",
    vehicleType: userData?.vehicleType || "",
  });

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
      const response = await fetch("https://spark-ev-backend.onrender.com/api/auth/delete", {
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

    const response = await fetch("https://spark-ev-backend.onrender.com/api/auth/updateProfile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedUserData),
    });

    if (response.ok) {
      const updatedUser = await response.json();
      alert("Profile updated successfully!");
      localStorage.setItem("user", JSON.stringify(updatedUser.user));
      setIsEditing(false);
      window.location.reload();
    } else {
      alert("Failed to update profile. Please try again.");
    }
  };

  const navigateToHome = () => navigate("/home");
  const navigateToSession = () => navigate("/sessions");
  const navigateToProfile = () => navigate("/profile");

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>MY PROFILE</h2>

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
              <>
                <div style={styles.infoRow}><span style={styles.label}>Name:</span><span style={styles.value}>{userData.name}</span></div>
                <div style={styles.infoRow}><span style={styles.label}>Email:</span><span style={styles.value}>{userData.email}</span></div>
                <div style={styles.infoRow}><span style={styles.label}>Mobile:</span><span style={styles.value}>{userData.mobile}</span></div>
                <div style={styles.infoRow}><span style={styles.label}>Vehicle:</span><span style={styles.value}>{userData.vehicleType || "Not provided"}</span></div>

                <div style={styles.buttonContainer}>
                  <button onClick={() => setIsEditing(true)} style={styles.editButton}>Edit Profile</button>
                  <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                  <button onClick={handleDeleteAccount} style={styles.deleteButton}>Delete Account</button>
                </div>
              </>
            )}
          </>
        ) : (
          <p style={styles.noUser}>No user data found</p>
        )}
      </div>
<FooterNav />


    </div>
  );
};
const neon = "#00fff7";
const darkBG = "#0d0d0d";

const styles = {
  page: {
    backgroundColor: darkBG,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 16px",
    minHeight: "95vh",
    fontFamily: "Orbitron, sans-serif",
  },
  container: {
    background: "#111",
    borderRadius: "16px",
    padding: "30px 20px",
    width: "80%",
    maxWidth: "420px",
    boxShadow: "0 0 12px rgba(0, 255, 247, 0.33)",
  },
  title: {
    color: neon,
    textAlign: "center",
    marginBottom: "24px",
    fontSize: "24px",
    letterSpacing: "1.2px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
    borderBottom: "1px solid #333",
    paddingBottom: "8px",
  },
  label: {
    color: "#aaa",
    fontSize: "14px",
    fontWeight: "500",
  },
  value: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    border: `1px solid ${neon}`,
    borderRadius: "10px",
    background: "#222",
    color: "#fff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  updateButton: {
    marginTop: "20px",
    padding: "12px",
    fontSize: "15px",
    background: neon,
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
    background: "#333",
    color: "#eee",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  editButton: {
    padding: "12px",
    background: "transparent",
    color: neon,
    border: `1px solid ${neon}`,
    borderRadius: "12px",
    cursor: "pointer",
  },
  logoutButton: {
    padding: "12px",
    background: "transparent",
    color: neon,
    border: `1px solid ${neon}`,
    borderRadius: "12px",
    marginTop: "12px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "12px",
    background: "transparent",
    color: "#ff4d4d",
    border: "1px solid #ff4d4d",
    borderRadius: "12px",
    marginTop: "12px",
    cursor: "pointer",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "20px",
  },
  noUser: {
    color: "#888",
    textAlign: "center",
    fontSize: "14px",
  },
  
  floatingNav: {
    position: "fixed",
    bottom: "15px",
    width: "90%",
    display: "flex",
    justifyContent: "center",
    gap: "3px",
    zIndex: 100,
  },
  floatingButton: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#193f4a",
    color: "#cdebf5",
    cursor: "pointer",
    boxShadow: "0 0 8px #86c6d7",
    transition: "all 0.3s ease",
  },
  profileButton: {
    flex: 1.5,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#ff9100",
    color: "#0f1a1d",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 8px #ff9100",
    transition: "all 0.3s ease",
  },
};

export default Profile;
