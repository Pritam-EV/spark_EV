#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include "time.h"

// ---------- Configuration ----------
const char* ssid      = "RokadeRaju";
const char* password  = "punamROKADE";

const char* mqttServer = "223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud";
const int   mqttPort   = 8883;            // HiveMQ TLS port
const char* mqttUser   = "pritam";
const char* mqttPass   = "Pritam123";

const String deviceId  = "EV123";
const int RELAY_PIN    = 12;
const int EMERGENCY_PIN = 14;             // active‑low button
const int LED_R = 27, LED_G = 26, LED_B = 25;

// ---------- Globals ----------
WiFiClientSecure net;
MqttClient       mqtt(net);               // ArduinoMqttClient

// PZEM on Serial2
PZEM004Tv30 pzem(Serial2, 16, 17);

String topicSessionStart, topicSessionStop, topicSessionLive,
       topicSessionEnd, topicStatus, topicSessionInfo;

bool   sessionActive   = false;
String sessionId, userId, transactionId;
float  energySelected  = 0.0, amountPaid = 0.0;
float  initialEnergy   = 0.0, energyConsumed = 0.0;
struct tm timeinfo;
unsigned long lastPublish = 0;

// ---------- Forward declarations ----------
void connectWiFi();
void connectMQTT();
void onMqttMessage();
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

  // Topic formulation
  topicSessionStart = "device/" + deviceId + "/session/start";
  topicSessionStop  = "device/" + deviceId + "/session/stop";
  topicSessionLive  = "device/" + deviceId + "/session/live";
  topicSessionEnd   = "device/" + deviceId + "/session/end";
  topicStatus       = "device/" + deviceId + "/status";
  topicSessionInfo  = "device/" + deviceId + "/session/info";
  topicSessionInfo  = "device/" + deviceId + "/session/info";
  
  connectWiFi();
  configTime(0, 0, "pool.ntp.org");        // UTC

  net.setInsecure();                       // dev‑only TLS
  connectMQTT();

  publishStatus("available");
  updateLED("available");
}

// ---------- Main loop ----------
void loop() {
  // keep connections alive
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.poll();

  // Handle any queued messages
// while (mqtt.parseMessage()) onMqttMessage();


  // Emergency stop
  if (digitalRead(EMERGENCY_PIN) == LOW) {
    Serial.println("!! EMERGENCY STOP PRESSED !!");
    publishStatus("faulty");
    updateLED("faulty");
    if (sessionActive) endSession();
  }

  // Active session periodic work
  if (sessionActive) {
    if (millis() - lastPublish >= 5000) {   // every 5 s
      publishSessionData();
      lastPublish = millis();
    }
    if (energyConsumed >= energySelected && energySelected > 0) {
      Serial.println("Energy target reached.");
      endSession();
    }
  }
}

// ---------- Wi‑Fi ----------
void connectWiFi() {
  Serial.printf("Connecting to Wi‑Fi %s", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.'); delay(500);
  }
  Serial.print("\nIP: "); Serial.println(WiFi.localIP());
}

// ---------- MQTT ----------
void connectMQTT() {
  Serial.print("Connecting MQTT ... ");
  mqtt.setId(("ESP32-" + deviceId).c_str());
  mqtt.setUsernamePassword(mqttUser, mqttPass);
  mqtt.setCleanSession(false);
  mqtt.onMessage(onMqttMessage);           // register callback

  while (!mqtt.connect(mqttServer, mqttPort)) {
    Serial.print('.'); delay(1000);
  }
  Serial.println("connected.");

  mqtt.subscribe(topicSessionStart.c_str(), 1);
  mqtt.subscribe(topicSessionStop.c_str(), 1);
  Serial.println("Subscribed to session topics.");
}

// ---------- MQTT message handler ----------
void onMqttMessage(int messageSize) {
  String tpc = mqtt.messageTopic();
  String msg;
  while (mqtt.available()) { msg += (char)mqtt.read(); }

  Serial.printf("⮕ %s : %s\n", tpc.c_str(), msg.c_str());

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, msg)) { Serial.println("JSON parse error."); return; }

  if (tpc == topicSessionStart) {
    userId        = doc["userId"] | "";
    transactionId = doc["transactionId"] | "";
    energySelected = doc["energySelected"] | 0.0;
    amountPaid     = doc["amountPaid"] | 0.0;
    Serial.println("Session START cmd OK.");
    startSession();
  } else if (tpc == topicSessionStop && sessionActive) {
    Serial.println("Session STOP cmd.");
    endSession();
  }
}

// ---------- Helpers ----------
void isoTimestamp(char* buf, size_t len) {
  getLocalTime(&timeinfo);
  snprintf(buf, len, "%04d-%02d-%02dT%02d:%02d:%02dZ",
           timeinfo.tm_year+1900, timeinfo.tm_mon+1, timeinfo.tm_mday,
           timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
}

// ---------- Status publisher ----------
void publishStatus(const char* st) {
  StaticJsonDocument<128> doc;
  doc["deviceId"] = deviceId;
  doc["status"]   = st;
  char payload[128]; size_t L = serializeJson(doc, payload);

  mqtt.beginMessage(topicStatus.c_str(), L, true, 1);
  mqtt.write((uint8_t*)payload, L);
  mqtt.endMessage();
  Serial.printf("⇢ status=%s\n", st);
}

// ---------- Start session ----------
void startSession() {
  char ts[30];  isoTimestamp(ts, sizeof(ts));
  sessionId     = deviceId + "_" + String(time(nullptr));
  sessionActive = true;
  initialEnergy = pzem.energy();
  energyConsumed = 0;

  digitalWrite(RELAY_PIN, HIGH);
  publishStatus("occupied");
  updateLED("occupied");

  // Build and send session‑info
  StaticJsonDocument<256> info;
  info["deviceId"]  = deviceId;
  info["sessionId"] = sessionId;
  info["userId"]    = userId;
  info["transactionId"] = transactionId;
  info["energy_kWh"]= energySelected;
  info["amountPaid"]= amountPaid;
  info["startTime"] = ts;
  char buf[256]; size_t L = serializeJson(info, buf);

  mqtt.beginMessage(topicSessionInfo.c_str(), L, true, 1);
  mqtt.write((uint8_t*)buf, L);
  mqtt.endMessage();
  Serial.println("⇢ session‑start info sent.");
}

// ---------- Live telemetry ----------
void publishSessionData() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power   = pzem.power();
  float eNow    = pzem.energy();
  if (isnan(voltage) || isnan(current)) {
    Serial.println("PZEM read error!");
    publishStatus("faulty");
    endSession();
    return;
  }
  energyConsumed = eNow - initialEnergy;

  char ts[30]; isoTimestamp(ts, sizeof(ts));
  StaticJsonDocument<256> live;
  live["deviceId"]   = deviceId;
  live["sessionId"]  = sessionId;
  live["energy_kWh"] = energyConsumed;
  live["power_W"]    = power;
  live["timestamp"]  = ts;
  char payload[256]; size_t L = serializeJson(live, payload);

  mqtt.beginMessage(topicSessionLive.c_str(), L, false, 1);
  mqtt.write((uint8_t*)payload, L);
  mqtt.endMessage();

  Serial.printf("Live: E=%.3f kWh P=%.1f W\n", energyConsumed, power);
}

// ---------- End session ----------
void endSession() {
  if (!sessionActive) return;
  sessionActive = false;
  digitalWrite(RELAY_PIN, LOW);

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
  Serial.printf("⇢ session end, %.3f kWh total.\n", energyConsumed);

  publishStatus("available");
  updateLED("available");
}

// ---------- LED helper ----------
void updateLED(const char* st) {
  if (!strcmp(st, "available")) {          // aqua
    digitalWrite(LED_R, LOW); digitalWrite(LED_G, HIGH); digitalWrite(LED_B, HIGH);
  } else if (!strcmp(st, "occupied")) {    // green blink simulated via toggle
    digitalWrite(LED_R, LOW); digitalWrite(LED_G, HIGH); digitalWrite(LED_B, LOW);
  } else {                                 // faulty = red
    digitalWrite(LED_R, HIGH); digitalWrite(LED_G, LOW); digitalWrite(LED_B, LOW);
  }
}
