#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include "time.h"
#include <Preferences.h>

// ---------- Configuration ----------
const char* ssid      = "RokadeRaju";
const char* password  = "punamROKADE";

const char* mqttServer = "223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud";
const int   mqttPort   = 8883;            // HiveMQ TLS port
const char* mqttUser   = "pritam";
const char* mqttPass   = "Pritam123";

const String deviceId  = "GLIDE03";
const int RELAY_PIN    = 12;
const int EMERGENCY_PIN = 14;             // active‑low button
const int LED_R = 27, LED_G = 26, LED_B = 25;

// ---------- Globals ----------
WiFiClientSecure net;
MqttClient       mqtt(net);               // ArduinoMqttClient
Preferences prefs;

// PZEM on Serial2 (energy meter)
PZEM004Tv30 pzem(Serial2, 16, 17);

String topicSessionCommand, topicSessionLive,
       topicSessionEnd, topicStatus, topicSessionInfo;

bool   sessionActive   = false;
String sessionId, userId, transactionId;
float  energySelected  = 0.0, amountPaid = 0.0;
float  initialEnergy   = 0.0, energyConsumed = 0.0;
struct tm timeinfo;
unsigned long lastPublish = 0;

// ---------- Function Prototypes ----------
void connectWiFi();
void connectMQTT();
void onMqttMessage(int messageSize);
void publishStatus(const char* st);
void startSession();
void publishSessionData();
void endSession();
void updateLED(const char* st);

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);       digitalWrite(RELAY_PIN, LOW);
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);

  // Initialize Preferences (EEPROM)
  prefs.begin("session", false);

  // Check for unfinished session in EEPROM
  bool prevActive = prefs.getBool("sessionActive", false);
  if (prevActive) {
    sessionId = prefs.getString("sessionId", "");
    userId = prefs.getString("userId", "");
    transactionId = prefs.getString("transactionId", "");
    energySelected = prefs.getFloat("energySelected", 0.0);
    amountPaid = prefs.getFloat("amountPaid", 0.0);
    initialEnergy = prefs.getFloat("initialEnergy", 0.0);
    sessionActive = true;
    Serial.println("Restored session from EEPROM: " + sessionId);
    // Restore device state to occupied
    digitalWrite(RELAY_PIN, HIGH);
    publishStatus("occupied");
    updateLED("occupied");
    // Publish relay state ON (so frontend knows)
    mqtt.beginMessage(("device/" + deviceId + "/relay/state").c_str(), 2, true, 1);
    mqtt.write((const uint8_t *)"ON", 2); 
    mqtt.endMessage();
  }

  // MQTT topics
  topicSessionCommand = "device/" + deviceId + "/sessionCommand";
  topicSessionLive    = "device/" + deviceId + "/session/live";
  topicSessionEnd     = "device/" + deviceId + "/session/end";
  topicStatus         = "device/" + deviceId + "/status";
  topicSessionInfo    = "device/" + deviceId + "/session/info";

  connectWiFi();
  configTime(0, 0, "pool.ntp.org");        // UTC time

  net.setInsecure();                       // TLS (insecure)
  connectMQTT();

  mqtt.subscribe(topicSessionCommand.c_str(), 1);
  Serial.println("Subscribed to session command topic.");

  publishStatus("Available");
  updateLED("available");
}

// ---------- Main Loop ----------
void loop() {
  // Keep connections alive
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.poll();

  // Emergency stop (button pressed)
  if (digitalRead(EMERGENCY_PIN) == LOW) {
    Serial.println("!! EMERGENCY STOP PRESSED !!");
    publishStatus("faulty");
    updateLED("faulty");
    if (sessionActive) endSession();
  }

  // During active session, publish live data periodically
  if (sessionActive) {
    if (millis() - lastPublish >= 5000) {   // every 5 seconds
      publishSessionData();
      lastPublish = millis();
    }
    // Auto-stop if energy target reached
    if (energyConsumed >= energySelected && energySelected > 0) {
      Serial.println("Energy target reached.");
      endSession();
    }
  }
}

// ---------- Wi-Fi Setup ----------
void connectWiFi() {
  Serial.printf("Connecting to Wi-Fi %s", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.'); delay(500);
  }
  Serial.print("\\nIP: "); Serial.println(WiFi.localIP());
}

// ---------- MQTT Setup ----------
void connectMQTT() {
  Serial.print("Connecting MQTT ... ");
  mqtt.setId(("ESP32-" + deviceId).c_str());
  mqtt.setUsernamePassword(mqttUser, mqttPass);
  mqtt.subscribe(("device/" + deviceId + "/sessionCommand").c_str(), 1); 
  mqtt.setCleanSession(false);
  mqtt.onMessage(onMqttMessage);           // register callback

  while (!mqtt.connect(mqttServer, mqttPort)) {
    Serial.print('.'); delay(1000);
  }
  Serial.println("connected.");
}

// ---------- MQTT Message Callback ----------
// ---------- MQTT Message Callback ----------
void onMqttMessage(int /*messageSize*/)          // size not needed
{
  // --- copy incoming payload ---
  String topic = mqtt.messageTopic();
  String json;
  while (mqtt.available()) json += char(mqtt.read());

  Serial.printf("⮕ %s : %s\n", topic.c_str(), json.c_str());

  // We only care about **device/<id>/sessionCommand**
  if (topic != topicSessionCommand) return;      // anything else → ignore

  // --- decode JSON ---
  StaticJsonDocument<256> cmd;
  if (deserializeJson(cmd, json)) {
    Serial.println("⚠️  sessionCommand JSON parse error – ignored");
    return;
  }

  const char* action = cmd["command"] | "";

  /*––––––––––––––––––––  START  ––––––––––––––––––––*/
  if (!strcmp(action, "start")) {

    if (sessionActive) {                         // already charging
      Serial.println("⚠️  duplicate start command – ignored");
      return;
    }

    /* Extract parameters sent from the front‑end */
    userId         = cmd["userId"]        | "";
    transactionId  = cmd["transactionId"] | "";
    energySelected = cmd["energySelected"]| 0.0;
    amountPaid     = cmd["amountPaid"]    | 0.0;
    sessionId      = cmd["sessionId"]     | "";

    Serial.println("✅ sessionCommand → START");
    startSession();                              // <- turns relay ON
  }

  /*––––––––––––––––––––  STOP  ––––––––––––––––––––*/
  else if (!strcmp(action, "stop")) {
    if (!sessionActive) {
      Serial.println("⚠️  stop command while no session – ignored");
      return;
    }
    Serial.println("✅ sessionCommand → STOP");
    endSession();                                // <- turns relay OFF
  }

  /*––––––––––––––––––––  UNKNOWN  –––––––––––––––––*/
  else {
    Serial.printf("⚠️  unknown command \"%s\" – ignored\n", action);
  }
}


// ---------- Generate ISO Timestamp ----------
void isoTimestamp(char* buf, size_t len) {
  getLocalTime(&timeinfo);
  snprintf(buf, len, "%04d-%02d-%02dT%02d:%02d:%02dZ",
           timeinfo.tm_year+1900, timeinfo.tm_mon+1, timeinfo.tm_mday,
           timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
}

// ---------- Publish Device Status ----------
void publishStatus(const char* st) {
  StaticJsonDocument<128> doc;
  doc["deviceId"] = deviceId;
  doc["status"]   = st;
  char payload[128]; size_t L = serializeJson(doc, payload);

  mqtt.beginMessage(topicStatus.c_str(), L, true, 1);
  mqtt.write((uint8_t*)payload, L);
  mqtt.endMessage();
  Serial.printf("⇢ status=%s\\n", st);
}

// ---------- Start Session Logic ----------
void startSession() {
  char ts[30];  isoTimestamp(ts, sizeof(ts));
  // Assume sessionId, userId, etc. already set from payload
  sessionActive = true;
  initialEnergy = pzem.energy();
  energyConsumed = 0;

  digitalWrite(RELAY_PIN, HIGH);
  publishStatus("occupied");
  updateLED("occupied");

  // Publish relay state ON for frontend
  mqtt.beginMessage(("device/" + deviceId + "/relay/state").c_str(), 2, true, 1);
  mqtt.write((const uint8_t *)"ON", 2); 
  mqtt.endMessage();

  // Build and send session-info JSON
  StaticJsonDocument<256> info;
  info["deviceId"]  = deviceId;
  info["sessionId"] = sessionId;
  info["userId"]    = userId;
  info["transactionId"] = transactionId; 
  info["energy_kWh"]= energySelected;
  info["amountPaid"]= amountPaid;
  info["startTime"] = ts;  // ISO start time
  char buf[256]; size_t L = serializeJson(info, buf);

  mqtt.beginMessage(topicSessionInfo.c_str(), L, true, 1);
  mqtt.write((uint8_t*)buf, L);
  mqtt.endMessage();
  Serial.println("⇢ session-start info sent.");

  // Save session details to EEPROM (Preferences)
  prefs.putBool("sessionActive", true);
  prefs.putString("sessionId", sessionId);
  prefs.putString("userId", userId);
  prefs.putString("transactionId", transactionId);
  prefs.putFloat("initialEnergy", initialEnergy);
  prefs.putFloat("energySelected", energySelected);
  prefs.putFloat("amountPaid", amountPaid);
  Serial.println("Saved session data to EEPROM.");
}

// ---------- Publish Live Telemetry -----------
void publishSessionData() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power   = pzem.power();
  float currentEnergy    = pzem.energy();
  if (isnan(voltage) || isnan(current)) {
    Serial.println("PZEM read error!");
    publishStatus("faulty");
    return;
  }
  energyConsumed = currentEnergy - initialEnergy;

  char ts[30]; isoTimestamp(ts, sizeof(ts));
  StaticJsonDocument<256> live;
  live["deviceId"]   = deviceId;
  live["sessionId"]  = sessionId;
  live["energy_kWh"] = energyConsumed;
  live["power_W"]    = power;
  live["voltage_V"]    = voltage;
  live["current_A"]    = current;
  live["timestamp"]  = ts;
  char payload[256]; size_t L = serializeJson(live, payload);

  mqtt.beginMessage(topicSessionLive.c_str(), L, false, 1);
  mqtt.write((uint8_t*)payload, L);
  mqtt.endMessage();

  Serial.printf("Live: E=%.3f kWh  P=%.1f W\\n", energyConsumed, power);
}

// ---------- End Session Logic -------------
void endSession() {
  if (!sessionActive) return;
  sessionActive = false;
  digitalWrite(RELAY_PIN, LOW);

  // Publish relay state OFF for frontend
  mqtt.beginMessage(("device/" + deviceId + "/relay/state").c_str(), 3, true, 1);
  mqtt.write((const uint8_t *)"OFF", 3);
  mqtt.endMessage();

  char ts[30]; isoTimestamp(ts, sizeof(ts));
  StaticJsonDocument<192> fin;
  fin["deviceId"]   = deviceId;
  fin["sessionId"]  = sessionId;
  fin["energy_kWh"] = energyConsumed;
  fin["endTime"]    = ts;
  char buf[192]; size_t L = serializeJson(fin, buf);

  mqtt.beginMessage(topicSessionEnd.c_str(), L, true, 1);
  mqtt.write((uint8_t*)buf, L);
  mqtt.endMessage();
  Serial.printf("⇢ session ended, %.3f kWh total.\\n", energyConsumed);

  publishStatus("Available");
  updateLED("available");

  // Clear stored session from EEPROM
  prefs.clear();
  Serial.println("Cleared session data from EEPROM.");
}

// ---------- LED Helper ----------
void updateLED(const char* st) {
  if (!strcmp(st, "available")) {          // aqua
    digitalWrite(LED_R, LOW); digitalWrite(LED_G, HIGH); digitalWrite(LED_B, HIGH);
  } else if (!strcmp(st, "occupied")) {    // green
    digitalWrite(LED_R, LOW); digitalWrite(LED_G, HIGH); digitalWrite(LED_B, LOW);
  } else {                                 // faulty = red
    digitalWrite(LED_R, HIGH); digitalWrite(LED_G, LOW); digitalWrite(LED_B, LOW);
  }
}
