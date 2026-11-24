# 🌍 CoolMap Global
### Live Heat Risk & AI Cooling Planner

**CoolMap Global** is a full-stack climate intelligence platform designed to monitor real-time environmental conditions, analyze urban heat risks, visualize environmental data, and generate AI-powered cooling recommendations.

It combines live environmental APIs, interactive geospatial visualization, and AI capabilities to help users understand climate conditions and explore practical cooling strategies.

---

## 🚀 Key Features

- **Live Weather Monitoring:** Real-time temperature, feels-like temperature, and weather information.
- **Heat Risk Monitoring:** Identify and understand heat-risk conditions across different locations.
- **Air Quality Monitoring:** Track Air Quality Index (AQI) and environmental conditions.
- **Interactive Maps:** Explore locations and environmental information through interactive maps.
- **Multi-Location Comparison:** Compare weather and environmental conditions across different locations.
- **Weather Visualizations:** Explore weather trends and 24-hour data charts.
- **Earthquake Monitoring:** Visualize earthquake information using USGS data.
- **Cyclone Monitoring:** Display cyclone-related information using available NOAA data.
- **AI Climate Briefings:** Generate AI-powered climate summaries and insights.
- **AI Cooling Planner:** Receive location-based cooling recommendations and safety suggestions.
- **Tree-Planting Simulator:** Explore potential environmental benefits of tree planting.
- **Location Search:** Search for locations and explore their environmental conditions.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Mapping | Leaflet.js |
| Weather Data | Open-Meteo API |
| Air Quality | Open-Meteo Air Quality API |
| Geospatial Data | OpenStreetMap, Nominatim |
| Earthquake Data | USGS |
| Cyclone Data | NOAA |
| AI Integration | OpenAI-compatible SDK, Groq |

---

## 🏗️ Project Architecture

```text
CoolMap Global
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── layers.js
│
├── server.js
├── package.json
├── package-lock.json
├── coolmaphyd.css
└── .gitignore
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js 18 or higher
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/nurulriyaz/coolmap-global.git
```

### 2. Navigate to the project directory

```bash
cd coolmap-global
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root and add the required AI API credentials.

Use the environment variable names expected by `server.js`.

**Important:** Never upload your `.env` file or API keys to GitHub.

### 5. Start the application

```bash
npm start
```

For development:

```bash
npm run dev
```

Open the local application in your browser using the URL displayed by your server.

---

## 🔌 Data Sources & APIs

CoolMap Global integrates environmental and geospatial data from:

- [Open-Meteo](https://open-meteo.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim](https://nominatim.org/)
- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/)
- [NOAA](https://www.noaa.gov/)

---

## 🤖 AI Capabilities

The platform integrates AI functionality to provide:

- Climate briefings and environmental summaries.
- Location-based cooling strategies.
- Heat-safety recommendations.
- AI-powered environmental assistance.

---

## 🎯 Project Objective

The objective of CoolMap Global is to combine climate data, geospatial technologies, and artificial intelligence into a single platform that makes environmental information more accessible and actionable.

---

## 👨‍💻 Developer

**Nurul Riyaz**

B.Sc. Data Science Student

GitHub: [@nurulriyaz](https://github.com/nurulriyaz)

---

## 📌 Project Status

**Version:** 1.0.0

**Status:** Development / Deployment in progress.

---

*CoolMap Global — Understanding Heat. Visualizing Risk. Planning a Cooler Future.*
