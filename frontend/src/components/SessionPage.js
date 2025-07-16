// src/components/SessionPage.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const SessionPage = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
    const sessionIdRef                = useRef(uuidv4());

  useEffect(() => {
    fetchSessions();
  }, []); // only once on mount

  const fetchSessions = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("🔒 No auth token – redirecting to login");
      return navigate("/login");
    }

    try {
      const res = await axios.get(
        "https://spark-ev-backend.onrender.com/api/sessions/user-sessions",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // backend returns { activeSessions: [...], pastSessions: [...] }
      setActiveSessions(res.data.activeSessions || []);
      setPastSessions(res.data.pastSessions || []);
    } catch (err) {
      console.error(
        "❌ Error fetching sessions:",
        err.response?.status,
        err.response?.data || err.message
      );
      // if unauthorized, kick to login
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 60px;
          background-color: #001f26;
          box-shadow: 0 2px 12px #04BFBF;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1002;
        }
        .top-bar-logo {
          height: 50px;
          filter: drop-shadow(0 0 6px #04BFBF);
        }
      `}</style>

      {/* Top Bar */}
      <div className="top-bar">
        <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
      </div>

      {/* Page Layout */}
      <Box
        sx={{
          pt: "60px", // space for top bar
          pb: "60px", // space for bottom nav
          height: "100vh", // full viewport
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          color: "#011F26",
        }}
      >
        {/* Scrollable Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ position: "relative", mb: 2 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: "#011F26",
                mb: 1,
                textAlign: "center",
              }}
            >
              Charging Sessions
            </Typography>

            <IconButton
              onClick={fetchSessions}
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                color: "#04BFBF",
                "&:hover": { color: "#011F26" },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
              <CircularProgress sx={{ color: "#04BFBF" }} />
            </Box>
          ) : (
            <>
              {/* Active Sessions Accordion */}
              <Accordion defaultExpanded sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#011F26" }} />}>
                  <Typography variant="h6" sx={{ color: "#011F26" }}>
                    Active Sessions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {activeSessions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
                      No active sessions found.
                    </Typography>
                  ) : (
                    activeSessions.map((s) => (
                      <SessionCard key={s.sessionId} session={s} isActive navigate={navigate} />
                    ))
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Past Sessions Accordion */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#011F26" }} />}>
                  <Typography variant="h6" sx={{ color: "#011F26" }}>
                    Past Sessions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {pastSessions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
                      No past sessions found.
                    </Typography>
                  ) : (
                    pastSessions.map((s) => (
                      <SessionCard key={s.sessionId} session={s} isActive={false} navigate={navigate} />
                    ))
                  )}
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Box>

        {/* Bottom Bar */}
        <FooterNav />
      </Box>
    </>
  );
};

const SessionCard = ({ session, isActive, navigate }) => (
  <Card
    sx={{
      background: "linear-gradient(to right, rgb(9, 36, 63), #243745)",
      borderRadius: "16px",
      mb: 2,
      boxShadow: "0 0 10px rgba(151, 241, 241, 0.2)",
    }}
  >
    <CardContent>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Device ID: {session.deviceId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Session ID: {session.sessionId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Transaction: {session.transactionId}</Typography>
      <Typography variant="body2" sx={{ color: "#9bcdd2" }}>Start: {new Date(session.startTime).toLocaleString()}</Typography>

      {isActive ? (
        <>
          <Typography variant="body2" sx={{ color: "#04BFBF" }}>LIVE</Typography>
          <Button
            variant="contained"
            onClick={() =>
              navigate(`/live-session/${sessionIdRef.current}`, {
                state: {
                  deviceId: session.deviceId,
                  amountPaid: session.amountPaid,
                  energySelected: session.energySelected,
                  transactionId: session.transactionId,
                },
              })
            }
            sx={{
              mt: 1,
              backgroundColor: "#F2A007",
              color: "#fff",
              borderRadius: "30px",
              fontSize: "0.8rem",
              "&:hover": { backgroundColor: "#f4af2d" },
            }}
          >
            View Live
          </Button>
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
            End: {session.endTime ? new Date(session.endTime).toLocaleString() : "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#9bcdd2" }}>
            Energy: {session.energyConsumed?.toFixed(2)} kWh | ₹{session.amountUsed?.toFixed(2)}
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
);

const accordionStyle = {
  background: "transparent",
  borderRadius: "10px",
  mb: 2,
  boxShadow: "0 0 10px rgba(4, 191, 191, 0.1)",
};

export default SessionPage;
