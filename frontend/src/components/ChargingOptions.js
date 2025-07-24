import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles2.css";
import FooterNav from "../components/FooterNav";

import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Slider,
    CircularProgress,
    Alert,
    Avatar,
} from "@mui/material";

function ChargingOptions() {
    const { device_id } = useParams();
    const [deviceDetails, setDeviceDetails] = useState(null);
    const [selectedOption, setSelectedOption] = useState("amount");
    const [sliderValue, setSliderValue] = useState(100);
    const [estimatedCost, setEstimatedCost] = useState(0);
    const [estimatedEnergy, setEstimatedEnergy] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const deviceId = device_id;


    const navigate = useNavigate();

    useEffect(() => {
        if (!device_id) {
            setError("Device ID is missing.");
            return;
        }

        const fetchDeviceDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/${device_id}`);
                if (!response.ok) throw new Error("Failed to fetch device details.");
                const data = await response.json();
                setDeviceDetails(data);
            } catch (err) {
                setError("Failed to load device details. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeviceDetails();
    }, [device_id]);

    useEffect(() => {
    if (selectedOption === "amount" && sliderValue > 0 && deviceDetails) {
        setEstimatedEnergy(sliderValue / (deviceDetails.rate || 20));
        setEstimatedCost(sliderValue);  // amount == cost
    }
    }, [deviceDetails, selectedOption, sliderValue]);



    const handleOptionSelect = (option) => {
        setSelectedOption(option);
        setSliderValue(0);
        setEstimatedCost(0);
        setEstimatedEnergy(0);
    };

    const handleSliderChange = (event, value) => {
        setSliderValue(value);
        if (selectedOption === "energy") {
            setEstimatedCost(value * (deviceDetails?.rate || 20));
            setEstimatedEnergy(0);
        } else if (selectedOption === "amount") {
            setEstimatedEnergy(value / (deviceDetails?.rate || 20));
            setEstimatedCost(value);
        }
    };

    const handleProceedToPayment = async () => {
        if (!selectedOption || sliderValue === 0) {
            alert("Please select a charging option and value!");
            return;
        }

        try {
            if (typeof window.Razorpay === "undefined") {
                throw new Error("Razorpay SDK not loaded. Please try again.");
            }

            const options = {
                key: "rzp_test_ahZDvz2uwfPVGS",
                amount: Math.round(estimatedCost * 100),
                currency: "INR",
                name: "Sparx Energy",
                description: "Charging Session Payment",
                handler: function (response) {
                    const transactionId = response.razorpay_payment_id;
                    navigate(`/session-start/${device_id}/${transactionId}`, {
                        state: {
                            deviceId: device_id,
                            amountPaid: estimatedCost,
                            chargingOption: selectedOption,
                            energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
                            
                        },
                        
                    });
                    console.log("🔍 Params:", { transactionId , deviceId  });
                },
                prefill: {
                    name: "User Name",
                    email: "user@example.com",
                    contact: "1234567890",
                },
                
            };


            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            console.error("Payment error: ", err.message);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: "#0b0e13" }}>
                <CircularProgress size={70} sx={{ color: "#04BFBF" }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: "#0b0e13" }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!deviceDetails) return null;

    return (
        <Box sx={{
           /// maxWidth: "400px",
           minHeight: "95vh",
           padding: { xs: 2, sm: 4 },
           margin: "auto",
           display: "flex",
           flexDirection: "column",
           alignItems: "center",
           background: "linear-gradient(145deg, #0b0e13, #111a21)",
           boxShadow: "0 0 20px rgba(4, 191, 191, 0.3)",
        }}>
            {/* Device Info Card */}
            <Card sx={{
                    mb: 3,
                    width: { xs: "90%", sm: "80%" },
                    background: "linear-gradient(to right, #1e2c3a, #243745)",
                    borderRadius: "16px",
                    padding: "14px",
                    color: "#e1f5f5",
                    boxShadow: "0 0 10px rgba(4, 191, 191, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                }}>
                {/* Device Image */}
                <Avatar
                    variant="rounded"
                    src="/device-image.png" 
                    alt="Device"
                    sx={{
                        width: 90,
                        height: 90,
                        
                    }}
                />

                {/* Device Details */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>Charger ID</Typography>
                    <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem" }}>
                        {deviceDetails.device_id}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem"  }}>
                        Location: {deviceDetails.location}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
                        Charger: {deviceDetails.charger_type}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#7de0dd", display: "block" }}>
                    Rate: ₹{deviceDetails?.rate || 20}/kWh
                    </Typography>
                </Box>
            </Card>

            {/* Charging Options */}
            <Grid container spacing={2} justifyContent="center">
                {["energy", "amount"].map((option) => (
                    <Grid item key={option}>
                        <Card
                            sx={{
                                textAlign: "center",
                                backgroundColor: selectedOption === option ? "#04BFBF" : "#1c2935",
                                borderRadius: "14px",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                boxShadow: selectedOption === option ? "0 0 12px #04BFBF" : "none",
                                "&:hover": {
                                    backgroundColor: "#243645",
                                    boxShadow: "0 0 10px rgba(4, 191, 191, 0.4)",
                                },
                            }}
                            onClick={() => handleOptionSelect(option)}
                        >
                            <CardContent>
                                <Typography variant="body2" sx={{ color: selectedOption === option ? "#0b0e13" : "#7de0dd" }}>
                                {option === "energy"
                                    ? `Energy-Based `
                                    : "Amount-Based"}
                                </Typography>

                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Slider Section */}
            {selectedOption && (
                <Box mt={4} width={{ xs: "90%", sm: "80%" }} sx={{
                        textAlign: "center",
                        padding: "20px",
                        borderRadius: "16px",
                        background: "#121b22",
                        boxShadow: "inset 0 0 10px rgba(4, 191, 191, 0.2)",
                    }}>
                    <Typography variant="body2" sx={{ color: "#e1f5f5", marginBottom: 2 }}>
                        {selectedOption === "energy"
                            ? "Select Energy (kWh)"
                            : "Select Amount (₹)"}
                    </Typography>
                    <Slider
                        value={sliderValue}
                        onChange={handleSliderChange}
                        min={selectedOption === "amount" ? 20 : 0}
                        max={selectedOption === "amount" ? 500 : 50}
                        step={selectedOption === "amount" ? 10 : 2}
                        marks
                        valueLabelDisplay="auto"
                        sx={{
                            color: "#04BFBF",
                            "& .MuiSlider-thumb": {
                                backgroundColor: "#7de0dd",
                                boxShadow: "0 0 5px #04BFBF",
                            },
                            "& .MuiSlider-rail": {
                                backgroundColor: "#2c4c57",
                            },
                            "& .MuiSlider-track": {
                                backgroundColor: "#04BFBF",
                            },
                        }}
                    />
                    <Typography variant="caption" sx={{ color: "#9bcdd2" }}>
                        {selectedOption === "energy"
                            ? `Selected Energy: ${sliderValue} kWh`
                            : `Selected Amount: ₹${sliderValue}`}
                    </Typography>
                    {selectedOption === "amount" && (
                        <Typography variant="caption" sx={{ color: "#7de0dd", display: "block" }}>
                            Estimated Energy: {estimatedEnergy.toFixed(2)} kWh
                        </Typography>
                    )}
                    {selectedOption === "energy" && (
                        <Typography variant="caption" sx={{ color: "#7de0dd", display: "block" }}>
                            Estimated Cost: ₹{estimatedCost.toFixed(0)}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Proceed to Payment */}
            <Box mt={4} textAlign="center" width="100%">
                <Button
                    variant="contained"
                    onClick={handleProceedToPayment}
                    disabled={
                        !selectedOption ||
                        sliderValue === 0 ||
                        deviceDetails.status === "occupied"
                    }
                    fullWidth={true}
                    sx={{
                        maxWidth: "300px",
                        mx: "auto",
                        padding: "12px 28px",
                        fontSize: "0.9rem",
                        borderRadius: "40px",
                        backgroundColor:
                            deviceDetails.status === "occupied" ? "#6c757d" : "#F2A007",
                        color: "#fff",
                        boxShadow:
                            deviceDetails.status === "occupied"
                                ? "none"
                                : "0 0 12px rgba(242, 160, 7, 0.6)",
                        "&:hover": {
                            backgroundColor:
                                deviceDetails.status === "occupied" ? "#6c757d" : "#f4af2d",
                        },
                    }}
                >
                    {deviceDetails.status === "occupied"
                        ? "Device Occupied"
                        : "Proceed to Payment"}
                </Button>

            </Box>
            <FooterNav />
        </Box>
    );
}

export default ChargingOptions;
