import React, { useEffect, useState } from "react";
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
  TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";

const SessionPage = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [filteredPastSessions, setFilteredPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ startDate: "", endDate: "" });

  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (filter.startDate || filter.endDate) {
      const filtered = pastSessions.filter((s) => {
        const sessionDate = new Date(s.startTime);
        const start = filter.startDate ? new Date(filter.startDate) : null;
        const end = filter.endDate ? new Date(filter.endDate) : null;
        return (
          (!start || sessionDate >= start) && (!end || sessionDate <= end)
        );
      });
      setFilteredPastSessions(filtered);
    } else {
      setFilteredPastSessions(pastSessions);
    }
  }, [filter, pastSessions]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("https://spark-ev-backend.onrender.com/api/sessions/user-sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { activeSessions = [], pastSessions = [] } = res.data;
      setActiveSessions(activeSessions);
      setPastSessions(pastSessions);
      setFilteredPastSessions(pastSessions);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Box
      sx={{
        minHeight: "95vh",
        padding: { xs: 2, sm: 3 },
        background: "linear-gradient(145deg, #0b0e13, #111a21)",
        color: "#e1f5f5",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: "", color: "#04BFBF", mb: 2 }}>
        🔌 My Charging Sessions
      </Typography>

      <Button
        variant="outlined"
        onClick={fetchSessions}
        sx={{
          mb: 3,
          color: "#04BFBF",
          borderColor: "#04BFBF",
          "&:hover": {
            backgroundColor: "#04BFBF",
            color: "#0b0e13",
          },
        }}
      >
        🔄 Refresh
      </Button>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress sx={{ color: "#04BFBF" }} />
        </Box>
      ) : (
        <>
          {/* ACTIVE SESSION ACCORDION */}
          <Accordion defaultExpanded sx={accordionStyle}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#7de0dd" }} />}>
              <Typography variant="h6" sx={{ color: "#7de0dd" }}>⚡ Active Sessions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {activeSessions.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#9bcdd2" }}>No active sessions found.</Typography>
              ) : (
                activeSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} isActive navigate={navigate} />
                ))
              )}
            </AccordionDetails>
          </Accordion>

          {/* PAST SESSION ACCORDION */}
          <Accordion sx={accordionStyle}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#7de0dd" }} />}>
              <Typography variant="h6" sx={{ color: "#7de0dd" }}>📋 Past Sessions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
                <TextField
                  label="From"
                  type="date"
                  name="startDate"
                  value={filter.startDate}
                  onChange={handleDateChange}
                  InputLabelProps={{ shrink: true }}
                  sx={filterInputStyle}
                />
                <TextField
                  label="To"
                  type="date"
                  name="endDate"
                  value={filter.endDate}
                  onChange={handleDateChange}
                  InputLabelProps={{ shrink: true }}
                  sx={filterInputStyle}
                />
              </Box>
              {filteredPastSessions.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#9bcdd2" }}>No past sessions found.</Typography>
              ) : (
                filteredPastSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} isActive={false} navigate={navigate} />
                ))
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}

      <FooterNav />
    </Box>
  );
};

const SessionCard = ({ session, isActive, navigate }) => (
  <Card
    sx={{
      background: "linear-gradient(to right, #1e2c3a, #243745)",
      borderRadius: "16px",
      mb: 2,
      boxShadow: "0 0 10px rgba(4, 191, 191, 0.2)",
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
              navigate(`/session/${session.sessionId}`, {
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

const filterInputStyle = {
  input: { color: "#e1f5f5" },
  label: { color: "#7de0dd" },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#04BFBF" },
    "&:hover fieldset": { borderColor: "#7de0dd" },
  },
};

export default SessionPage;
 