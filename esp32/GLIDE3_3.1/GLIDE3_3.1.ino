// --- Core Libraries ---
#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <EEPROM.h>
#include <ArduinoJson.h>
#include "esp_system.h"
#include "esp_task_wdt.h"
#include <HTTPClient.h>

// --- WiFi Credentials ---
const char ssid[] = "RokadeRaju";
const char pass[] = "punamROKADE";

// --- MQTT Credentials ---
const char* mqtt_server = "223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud";
const char* mqtt_username = "pritam";
const char* mqtt_password = "Pritam123";
const int mqtt_port = 8883;
const char* backendEndpoint = "https://spark-ev-backend.onrender.com/api/sessions/start";  // ✅ update this
const char* endSessionEndpoint  = "https://spark-ev-backend.onrender.com/api/sessions/end";

// --- MQTT Topics ---
const char* topicRelayControl = "GLIDE03/relay/set";   // used to receive ON/OFF command
const char* topicRelayStatus  = "GLIDE03/relay/state"; // used to publish actual state
const char *topicEnergy = "GLIDE03/energy";
const char *topicDeviceStatus = "GLIDE03/deviceStatus";
const char *topicStartSession = "GLIDE03/session/start";
const char* topicSessionCommand = "GLIDE03/sessionCommand";


// HiveMQ Cloud Let's Encrypt CA certificate (hardcoded)
static const char *root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// --- Clients ---
WiFiClientSecure espClient;
PubSubClient client(espClient);

// --- Relay, EEPROM, PZEM ---
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);

const int relayPin = 12;
bool relayState = false;

#define EEPROM_SIZE 64
#define ADDR_RELAY_STATE    0
#define ADDR_TOTAL_ENERGY   4
#define ADDR_ENERGY     0     // float, 4 bytes
#define ADDR_ENERGY_SEL 4     // float
#define ADDR_RELAY      8     // bool
#define ADDR_SESSION_ACTIVE 12 // bool
#define ADDR_TIMESTAMP  16    // uint32_t
#define SESSION_ENERGY_ADDR    20    // ✅ float (4 bytes), no overlap
#define ADDR_SESSION_START_ENERGY 24  // or a valid offset


// CONFIGURATION
#define DEVICE_ID       "GLIDE03"     // change this for other devices
#define RELAY_PIN       12
#define REDPIN         32
#define GREENPIN       33
#define BLUEPIN        25
#define STOP_BUTTON_PIN 33

#define SESSION_ID_ADDR     12   // EEPROM offset for session ID (string)
#define SESSION_ENERGY_ADDR 24   // Offset to store energy at start

float targetEnergy = 0.0;
float totalEnergy = 0.0;
float energySelected = 0.0;
bool sessionActive = false;
uint32_t lastSessionTimestamp = 0;

unsigned long lastEnergyUpdate = 0;

// Session Tracking
String sessionId = "";
unsigned long sessionStartMillis = 0;
unsigned long sessionEndMillis = 0;
float sessionStartEnergy = 0.0;
float sessionEndEnergy = 0.0;
float sessionCost = 0.0;
float ratePerKWh = 19.0;  // ₹19 per kWh (can be customized)

float startEnergy = 0.0;
float currentEnergy = 0.0;
float deltaEnergy = 0.0;

unsigned long lastEnergyCheck = 0;
unsigned long lastMqttPublish = 0;

const unsigned long ENERGY_CHECK_INTERVAL = 1000; // 1 sec
const unsigned long MQTT_PUBLISH_INTERVAL = 5000; // 5 sec



// --- Function Prototypes ---
void reconnectWiFi();
void reconnectMQTT();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void sendSensorData();
void saveRelayStateToEEPROM();
void readRelayStateFromEEPROM();
void saveSessionStateToEEPROM();
void updateLED();

// --- Emergency Button Hold Detection ---
unsigned long buttonPressStartTime = 0;
bool buttonPressed = false;
bool emergencyToggled = false;
bool lastRelayStateBeforeEmergency = false;



void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17);  // PZEM RX/TX

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STOP_BUTTON_PIN, INPUT_PULLUP);
  pinMode(REDPIN, OUTPUT);
  pinMode(GREENPIN, OUTPUT);
  pinMode(BLUEPIN, OUTPUT);

EEPROM.begin(EEPROM_SIZE);
loadSessionFromEEPROM();

// Debug logs for diagnosis
Serial.printf("🧠 EEPROM Load: totalEnergy = %.3f kWh\n", totalEnergy);
Serial.printf("🔌 Relay was %s before power loss\n", relayState ? "ON" : "OFF");
Serial.printf("📡 Session Active: %s\n", sessionActive ? "Yes" : "No");

// Restore relay if needed
if (sessionActive && relayState) {
      EEPROM.get(ADDR_SESSION_START_ENERGY, startEnergy);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("✅ Restoring session → Relay turned ON");
} else {
  digitalWrite(RELAY_PIN, LOW);
}


  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  configTime(0, 0, "pool.ntp.org");
  espClient.setCACert(root_ca);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  reconnectMQTT();

  String topic = String("payment/") + DEVICE_ID;
  client.subscribe(topic.c_str());
  Serial.println("Subscribed to " + topic);


Serial.println("🔄 Boot Diagnostics:");
Serial.printf("📶 WiFi SSID: %s\n", WiFi.SSID().c_str());
Serial.printf("🧠 IP Address: %s\n", WiFi.localIP().toString().c_str());
Serial.printf("🔁 Relay State: %s\n", relayState ? "ON" : "OFF");
Serial.printf("⚡ Session Active: %s\n", sessionActive ? "YES" : "NO");
Serial.printf("🔋 Total Energy: %.3f kWh\n", totalEnergy);
Serial.printf("🪫 Energy Selected: %.3f kWh\n", energySelected);
Serial.printf("📦 startEnergy (EEPROM): %.3f kWh\n", startEnergy);


}




void loop() {
  if (!client.connected()) reconnectMQTT();
  if (WiFi.status() != WL_CONNECTED) reconnectWiFi();

  client.loop();
  updateLED();



static unsigned long lastLoopLog = 0;
if (millis() - lastLoopLog >= 10000) {
  lastLoopLog = millis();
  Serial.println("🔄 Loop running | WiFi: " + String(WiFi.isConnected() ? "OK" : "DISCONNECTED") + " | MQTT: " + String(client.connected() ? "OK" : "DISCONNECTED"));
}


static unsigned long lastRelayStatePublish = 0;
unsigned long currentMillis = millis();

if (currentMillis - lastRelayStatePublish >= 5000) {
  lastRelayStatePublish = currentMillis;
  client.publish(topicRelayStatus, relayState ? "ON" : "OFF", true);
  Serial.print("📤 topicRelayStatus → ");
Serial.println(relayState ? "ON" : "OFF");
}

unsigned long now = millis();

if (now - lastEnergyUpdate >= 5000) { // Every 5 seconds
  lastEnergyUpdate = now;

  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();

  if (!isnan(voltage) && !isnan(current) && !isnan(energy)) {
    Serial.printf("⚡ Voltage: %.2f V | Current: %.2f A | Energy: %.3f kWh\n", voltage, current, energy);

    client.publish("GLIDE03/sensor/voltage", String(voltage, 2).c_str(), true);
    client.publish("GLIDE03/sensor/current", String(current, 2).c_str(), true);
    client.publish("GLIDE03/sensor/energy", String(energy, 3).c_str(), true);
  } else {
    Serial.println("⚠️ Invalid PZEM reading. Skipping publish.");
  }
}



// Emergency button logic
bool buttonState = digitalRead(STOP_BUTTON_PIN) == LOW;

if (buttonState && !buttonPressed) {
  buttonPressed = true;
  buttonPressStartTime = millis();
}

if (!buttonState && buttonPressed) {
  // Button released before 3 seconds
  buttonPressed = false;
  emergencyToggled = false;
}

if (buttonPressed && !emergencyToggled && (millis() - buttonPressStartTime >= 2000)) {
  // Held for 2 seconds
  emergencyToggled = true;

  if (relayState) {
    // Save last state and turn off relay immediately
    lastRelayStateBeforeEmergency = true;
    relayState = false;
    digitalWrite(RELAY_PIN, LOW);
    saveRelayStateToEEPROM();
    client.publish((String(DEVICE_ID) + "/relayState").c_str(), "OFF", true);
    client.publish((String(DEVICE_ID) + "/alerts").c_str(), "🛑 Emergency Stop Activated");
    Serial.println("🛑 Emergency Button Held: Relay OFF Immediately");
  } else if (lastRelayStateBeforeEmergency) {
    // Restore previous state
    relayState = true;
    digitalWrite(RELAY_PIN, HIGH);
    saveRelayStateToEEPROM();
    client.publish((String(DEVICE_ID) + "/relayState").c_str(), "ON", true);
    client.publish((String(DEVICE_ID) + "/alerts").c_str(), "✅ Relay Restored After Emergency");
    Serial.println("✅ Emergency Reset: Relay Restored");
  }
}

  // Session parameters (to be set when session starts)
String sessionId = "";
float energySelected = 0.0;     // kWh limit for this session
float amountPaid = 0.0;         // Optional: track payment amount
unsigned long sessionStartTime = 0; // millis() when session started

if (sessionActive) {
  unsigned long now = millis();

  if (now - lastEnergyCheck >= ENERGY_CHECK_INTERVAL) {
    lastEnergyCheck = now;
    currentEnergy = pzem.energy();
    deltaEnergy = currentEnergy - startEnergy;

    if (deltaEnergy < 0) deltaEnergy = 0.0; // Safety
  }

  if (now - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    lastMqttPublish = now;

    float voltage = pzem.voltage();
    float current = pzem.current();

    Serial.printf("⚡ Voltage: %.1fV | Current: %.2fA | Start: %.3fkWh | Current: %.3fkWh | Used: %.3fkWh\n",
                  voltage, current, startEnergy, currentEnergy, deltaEnergy);

    client.publish((String(DEVICE_ID) + "/startenergy").c_str(), String(startEnergy, 3).c_str());
    client.publish((String(DEVICE_ID) + "/currentenergy").c_str(), String(currentEnergy, 3).c_str());
    client.publish((String(DEVICE_ID) + "/deltaenergy").c_str(), String(deltaEnergy, 3).c_str());
    client.publish((String(DEVICE_ID) + "/voltage").c_str(), String(voltage, 1).c_str());
    client.publish((String(DEVICE_ID) + "/current").c_str(), String(current, 2).c_str());

  }
if (sessionActive && energySelected > 0 && deltaEnergy >= energySelected) {
  Serial.printf("🧪 [Check] deltaEnergy = %.3f | energySelected = %.3f\n", deltaEnergy, energySelected);
  Serial.println("✅ Energy limit reached. Stopping session...");
  stopSession(false);  // Not emergency
}

}



}
void updateLED() {
  static unsigned long previousMillis = 0;
  const long blinkInterval = 1000;
  static bool ledState = false;
  unsigned long currentMillis = millis();

  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
    // Not connected → RED
    analogWrite(REDPIN, 255);
    analogWrite(GREENPIN, 0);
    analogWrite(BLUEPIN, 0);
  } 
  else if (relayState) {
    // Relay ON → GREEN blinking
    if (currentMillis - previousMillis >= blinkInterval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      analogWrite(REDPIN, 0);
      analogWrite(GREENPIN, ledState ? 255 : 0);
      analogWrite(BLUEPIN, 0);
    }
  } 
  else {
    // Connected & relay OFF → Aquamarine color
    analogWrite(REDPIN, 126);
    analogWrite(GREENPIN, 166);
    analogWrite(BLUEPIN, 191);
  }
}



void startNewSession(float selectedEnergy, float paidAmount, String transactionId, String newSessionId) {
  // Generate session ID
  unsigned long timestamp = millis();
  sessionId = DEVICE_ID + String("_") + String(timestamp); // Example: GLIDE03_1234567
  sessionStartMillis = millis();
  startEnergy = pzem.energy();
  lastEnergyCheck = millis();
  lastMqttPublish = millis();
  sessionStartEnergy = pzem.energy(); // ✅ Read actual energy from PZEM
  sessionId = newSessionId;

  energySelected = selectedEnergy;

Serial.printf("🚀 New session started: ID=%s, StartEnergy=%.3f kWh\n", sessionId.c_str(), sessionStartEnergy);

  sessionActive = true;
  relayState = true;
  digitalWrite(RELAY_PIN, HIGH);


  // Store energy & session info to EEPROM
  EEPROM.put(SESSION_ENERGY_ADDR, sessionStartEnergy);
  EEPROM.put(ADDR_ENERGY_SEL, energySelected);
  EEPROM.put(ADDR_SESSION_START_ENERGY, startEnergy);
  EEPROM.write(ADDR_RELAY, 1);  // relay ON
  EEPROM.commit();



  Serial.println("🚀 New Charging Session Started");
  Serial.println("🧾 Transaction ID: " + transactionId);
  Serial.println("🔢 Session ID: " + sessionId);
  Serial.printf("⚡ Energy Selected: %.2f kWh\n", energySelected);
  Serial.printf("💰 Amount Paid: ₹%.2f\n", paidAmount);
  Serial.printf("📉 Start Energy: %.3f\n", startEnergy);

  // Publish acknowledgement or log
  StaticJsonDocument<256> doc;
  doc["sessionId"] = sessionId;
  doc["transactionId"] = transactionId;
  doc["energySelected"] = selectedEnergy;
  doc["amountPaid"] = paidAmount;
  doc["startTime"] = millis();

  String log;
  serializeJson(doc, log);
  client.publish("GLIDE03/session/logs", log.c_str());

  client.publish((String(DEVICE_ID) + "/relayState").c_str(), "ON", true);
  client.publish((String(DEVICE_ID) + "/status/device").c_str(), "Occupied", true);
}


void sendSessionStartToBackend(
  String sessionId,
  String deviceId,
  String transactionId,
  float startEnergy,
  float energySelected,
  float amountPaid
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected. Cannot send session data.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // Only for testing without CA cert. Use setCACert() in production.

  HTTPClient https;
  https.begin(client, backendEndpoint);
  https.addHeader("Content-Type", "application/json");

  // Construct ISO time strings
  String startTime = getISOTime();     // You should implement getISOTime() using NTP time
  String startDate = getFormattedDate(); // e.g. 2025-07-09

  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["sessionId"] = sessionId;
  doc["deviceId"] = deviceId;
  doc["transactionId"] = transactionId;
  doc["startTime"] = startTime;
  doc["startDate"] = startDate;
  doc["startEnergy"] = startEnergy;
  doc["energySelected"] = energySelected;
  doc["amountPaid"] = amountPaid;
  // doc["userId"] = "optional_user_id_here";

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("📤 Sending session start to backend:");
  Serial.println(requestBody);

  int httpResponseCode = https.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = https.getString();
    Serial.printf("✅ Backend response [%d]: %s\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("❌ Failed to POST: %s\n", https.errorToString(httpResponseCode).c_str());
  }

  https.end();
}

void endSession() {
  sessionEndMillis = millis();
  sessionEndEnergy = totalEnergy;

  float energyUsed = sessionEndEnergy - sessionStartEnergy;
  sessionCost = energyUsed * ratePerKWh;

  Serial.println("🛑 Ending Session");
  Serial.printf("Session ID: %s\n", sessionId.c_str());
  Serial.printf("Energy Used: %.3f kWh\n", energyUsed);
  Serial.printf("Cost: ₹%.2f\n", sessionCost);

  // Optional: publish to MQTT
  String report = "{";
  report += "\"sessionId\":\"" + sessionId + "\",";
  report += "\"startEnergy\":" + String(sessionStartEnergy, 3) + ",";
  report += "\"endEnergy\":" + String(sessionEndEnergy, 3) + ",";
  report += "\"energyUsed\":" + String(energyUsed, 3) + ",";
  report += "\"cost\":" + String(sessionCost, 2) + ",";
  report += "\"startTime\":" + String(sessionStartMillis) + ",";
  report += "\"endTime\":" + String(sessionEndMillis);
  report += "}";

  client.publish("GLIDE03/session/logs", report.c_str());

  // Reset values
  sessionId = "";
  sessionStartEnergy = 0.0;
  sessionCost = 0.0;

  EEPROM.commit();
}


void sendSessionEndToBackend(
  String sessionId,
  float currentEnergy,
  float deltaEnergy,
  float amountUsed,
  String endTrigger,
  String deviceId = ""
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected. Cannot end session.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // ❗ Use CA cert in production

  HTTPClient https;
  https.begin(client, endSessionEndpoint);
  https.addHeader("Content-Type", "application/json");

  // Timestamp of session end
  String endTime = getISOTime();  // Reuse from earlier

  StaticJsonDocument<512> doc;
  doc["sessionId"] = sessionId;
  doc["endTime"] = endTime;
  doc["currentEnergy"] = currentEnergy;
  doc["deltaEnergy"] = deltaEnergy;
  doc["amountUsed"] = amountUsed;
  doc["endTrigger"] = endTrigger;
  if (deviceId != "") doc["deviceId"] = deviceId;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("📤 Sending session end to backend:");
  Serial.println(requestBody);

  int httpResponseCode = https.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = https.getString();
    Serial.printf("✅ Backend response [%d]: %s\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("❌ POST failed: %s\n", https.errorToString(httpResponseCode).c_str());
  }

  https.end();
}

String getISOTime() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);

  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

String getFormattedDate() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);

  char buf[11];
  strftime(buf, sizeof(buf), "%Y-%m-%d", &timeinfo);
  return String(buf);
}


void monitorSession() {
  if (sessionId != "" && relayState) {
    // Check if energy limit reached or exceeded
    if (energySelected > 0 && totalEnergy >= energySelected) {
      Serial.println("⚡ Energy limit reached. Stopping session.");
      digitalWrite(relayPin, LOW);
      relayState = false;
      saveRelayStateToEEPROM();
      endSession();
    }
  }
}


// --- Sensor and Session Logic ---
void sendSensorData() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power   = pzem.power();

  if (isnan(voltage) || isnan(current) || isnan(power)) return;

  unsigned long now = millis();
  float deltaEnergy = 0.0;

  float power_kW = power / 1000.0;
  float timeDiffHr = (now - lastEnergyUpdate) / 3600000.0;
  deltaEnergy = power_kW * timeDiffHr;

  if (deltaEnergy >= 0 && deltaEnergy < 1.0) {
    totalEnergy += deltaEnergy;
    lastEnergyUpdate = now;
    EEPROM.put(ADDR_TOTAL_ENERGY, totalEnergy);
    EEPROM.commit();
  }

  client.publish(topicEnergy, String(totalEnergy, 3).c_str());
  Serial.print("📤 Relay state published: ");


  client.publish(topicDeviceStatus, topicRelayStatus ? "Occupied" : "Available", true);

  // Auto-stop if session is complete
  if (sessionActive && totalEnergy >= targetEnergy) {
    Serial.println("✅ Energy target reached. Stopping...");
    sessionActive = false;
    targetEnergy = 0.0;
    saveSessionStateToEEPROM();
    relayState = false;
    digitalWrite(relayPin, LOW);
    saveRelayStateToEEPROM();
    client.publish(topicRelayControl, "OFF", true);
    client.publish("GLIDE03/session/status", "Completed", true);
  }
}
void startSession(float selectedEnergy) {
  energySelected = selectedEnergy;
  totalEnergy = 0.0;
  sessionActive = true;
  relayState = true;
  digitalWrite(RELAY_PIN, HIGH);
  saveSessionToEEPROM();
client.publish((String(DEVICE_ID) + "/relayState").c_str(), "ON", true);
client.publish((String(DEVICE_ID) + "/status/device").c_str(), "Occupied", true);
}

void stopSession(bool isEmergency) {
  relayState = false;
  sessionActive = false;
  energySelected = 0.0;
  digitalWrite(RELAY_PIN, LOW);
  saveSessionToEEPROM();

  client.publish((String(DEVICE_ID) + "/relayState").c_str(), "OFF", true);
  client.publish((String(DEVICE_ID) + "/status/device").c_str(), "Available", true);

  if (isEmergency) {
    client.publish((String(DEVICE_ID) + "/alerts").c_str(), "🛑 Emergency Stop Pressed");
  } else {
    client.publish((String(DEVICE_ID) + "/alerts").c_str(), "⚠️ Session Stopped");
  }
}



// --- EEPROM ---
void saveRelayStateToEEPROM() {
  EEPROM.write(ADDR_RELAY_STATE, relayState ? 1 : 0);
  EEPROM.commit();
}

void readRelayStateFromEEPROM() {
  relayState = EEPROM.read(ADDR_RELAY_STATE) == 1;
  digitalWrite(relayPin, relayState ? HIGH : LOW);
}

void saveSessionToEEPROM() {
  EEPROM.put(ADDR_ENERGY, totalEnergy);
  EEPROM.put(ADDR_ENERGY_SEL, energySelected);
  EEPROM.write(ADDR_RELAY, relayState);
EEPROM.write(ADDR_SESSION_ACTIVE, sessionActive ? 1 : 0);

  EEPROM.put(ADDR_TIMESTAMP, millis() / 1000);
  EEPROM.commit();
  Serial.println("💾 EEPROM updated: Relay state = " + String(relayState ? "ON" : "OFF"));

}

void loadSessionFromEEPROM() {
  EEPROM.get(ADDR_ENERGY, totalEnergy);
  EEPROM.get(ADDR_ENERGY_SEL, energySelected);
  EEPROM.get(ADDR_SESSION_START_ENERGY, startEnergy);
Serial.printf("📦 Restored startEnergy from EEPROM: %.3f kWh\n", startEnergy);

  relayState = EEPROM.read(ADDR_RELAY);
sessionActive = EEPROM.read(ADDR_SESSION_ACTIVE) == 1;

  EEPROM.get(ADDR_TIMESTAMP, lastSessionTimestamp);

  // ✅ Restore startEnergy
  EEPROM.get(SESSION_ENERGY_ADDR, sessionStartEnergy);

  Serial.println("🔁 Restoring session from EEPROM...");
  Serial.printf("  - Total Energy     : %.3f kWh\n", totalEnergy);
  Serial.printf("  - Energy Selected  : %.3f kWh\n", energySelected);
  Serial.printf("  - Session Active   : %s\n", sessionActive ? "Yes" : "No");
  Serial.printf("  - Relay State      : %s\n", relayState ? "ON" : "OFF");
  Serial.printf("  - Start Energy     : %.3f kWh\n", sessionStartEnergy);  // ✅ check this

  if (sessionActive && relayState) {
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("✅ Restored session → Relay ON");
  } else {
    digitalWrite(RELAY_PIN, LOW);
  }
}



// --- WiFi & MQTT ---
void reconnectWiFi() {
  Serial.print("Reconnecting WiFi...");
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");
}

void reconnectMQTT() {
  while (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      client.subscribe(topicRelayControl);
      client.subscribe(topicStartSession);
      client.subscribe(topicSessionCommand);  // Make sure this line is reached!
      client.publish((String(DEVICE_ID) + "/relayStatus").c_str(), relayState ? "ON" : "OFF", true);
client.publish((String(DEVICE_ID) + "/status/device").c_str(), relayState ? "Occupied" : "Available", true);

      Serial.println("MQTT Connected.");
      Serial.println("Subscribed to " + String(topicRelayControl));
      Serial.println("Subscribed to " + String(topicStartSession));
      Serial.println("Subscribed to " + String(topicSessionCommand));
      Serial.println("📤 Publishing status: GLIDE03/status/connection → Active");

    } else {
      Serial.print(".");
      delay(1000);
    }
  }
}



void mqttCallback(char *topic, byte *payload, unsigned int length) {
  Serial.print("🧭 Received topic: ");
  Serial.println(topic);
  Serial.print("📩 Payload: ");

  String msg;
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.println(msg);

  // --- Relay Control ---
if (strcmp(topic, topicRelayControl) == 0) {
  Serial.println("🧭 Received topic: " + String(topic));
  Serial.println("📩 Payload: " + msg);

  if (msg == "ON") {
    digitalWrite(RELAY_PIN, HIGH);
    relayState = true;
    Serial.println("🔌 Relay turned ON via MQTT");
    client.publish(topicRelayStatus, "ON", true);
    saveRelayStateToEEPROM();
  } else if (msg == "OFF") {
    stopSession(false);
    digitalWrite(RELAY_PIN, LOW);
    relayState = false;
    Serial.println("🔌 Relay turned OFF via MQTT");
    client.publish(topicRelayStatus, "OFF", true);
    saveRelayStateToEEPROM();
  } else {
    Serial.println("⚠️ Invalid command");
  }
}



  // --- Session Command ---
else if (strcmp(topic, topicSessionCommand) == 0) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) {
    Serial.println("❌ Failed to parse JSON");
    return;
  }

  String command = doc["command"] | "";
  if (command == "start") {
    String transactionId = doc["transactionId"] | "";
    float energy = doc["energySelected"] | 0.0;
    float amount = doc["amountPaid"] | 0.0;

    if (transactionId != "" && energy > 0 && amount > 0) {
    startNewSession(energy, amount, transactionId, sessionId);  // ✅ Fixed: 4 arguments

    } else {
      Serial.println("❌ Missing transactionId, energy, or amount");
    }
  }
}

}
