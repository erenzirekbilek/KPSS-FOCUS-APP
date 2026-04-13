<div align="center">

<img src="./assets/images/project-images/icon-2.png" width="96" height="96" alt="KPSS Focus Logo" />

# KPSS Focus

**A productivity and study tracking assistant for KPSS candidates**

[![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Usage](#-usage) · [Screenshots](#-screenshots) · [Contributing](#-contributing)

</div>

---

## Overview

KPSS Focus is a mobile study assistant built for candidates preparing for the Kamu Personeli Seçme Sınavı (KPSS). It combines a customizable Pomodoro timer, subject-based progress tracking, and detailed analytics into a single focused environment — helping you work smarter, stay consistent, and enter exam day prepared.

---

## Features

### Pomodoro Timer
A study-specific timer adapted for KPSS exam preparation, not generic productivity.

- **Subject-aware sessions** — Configure session length per subject (e.g., 25 min for Eğitim Bilimleri, up to 50 min for intensive Matematik problem sets).
- **Smart break prompts** — After consecutive completed sessions, the app automatically suggests a long break to prevent cognitive fatigue.
- **Integrated tracking** — Each Pomodoro session is logged against the active subject so you can see exactly how much time you've invested per topic.
- **Focus mode** — Minimizes distracting notifications during active study sessions.

### Subject & Topic Tracker
Structured around the current ÖSYM curriculum with full hierarchy support.

- **Three-category curriculum** — Covers Genel Yetenek, Genel Kültür, and Eğitim Bilimleri down to individual subtopics.
- **Question counter** — Log the number of questions solved per topic to track volume, not just time.
- **Visual progress bars** — See completion percentages per subject at a glance to stay motivated.
- **Weak point detection** — Automatically flags topics where your solved question count or practice results indicate gaps that need review.

### Analytics & Statistics
Transforms raw study data into actionable insight.

| View | What it shows |
| :--- | :--- |
| **Daily / Weekly / Monthly charts** | Study duration and question volume over time |
| **Subject distribution** | Pie chart breakdown of time spent per subject |
| **Activity heatmap** | Calendar view showing consistency and high-output days |
| **Period comparison** | Automatic delta reporting vs. previous week or month |

### Additional
- **True/False practice mode** — Dedicated flashcard-style session for T/F question sets.
- **Mini games** — Light break-time activities to reset focus between study sessions.
- **Dark mode** — Full dark theme for comfortable evening study.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | React Native (Expo) |
| Language | TypeScript / JavaScript |
| State Management | Redux Toolkit · Context API |
| Database | SQLite |
| UI | React Native Paper · NativeWind (Tailwind CSS) |
| Charts | React Native Chart Kit |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- npm or yarn
- [Expo Go](https://expo.dev/client) app on your mobile device (for physical device testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/erenkirekbilek/kpss-focus.git
   cd kpss-focus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on a device or emulator**

   | Method | Command |
   | :--- | :--- |
   | Android emulator | `npm run android` |
   | iOS simulator | `npm run ios` |
   | Physical device | Scan the QR code with Expo Go |

---

## Usage

| Screen | Description |
| :--- | :--- |
| **Welcome** | Onboarding screen shown on first launch |
| **Dashboard** | Pomodoro timer, today's stats, and quick-access actions |
| **Subjects** | Browse KPSS topics, log solved questions, track progress |
| **True-False** | Dedicated practice mode for T/F question sets |
| **Statistics** | Charts, heatmap, and period comparison for your study data |
| **Games** | Mini games for structured break-time activity |

---

## Screenshots

| Screen | Preview |
| :--- | :--- |
| Demo | ![Demo](./assets/images/project-images/project-video.gif) |
| Welcome | ![Welcome](./assets/images/project-images/Welcome-Page.png) |
| Dashboard | ![Dashboard](./assets/images/project-images/Dashboard.png) |
| Subjects | ![Subjects](./assets/images/project-images/subjects.png) |
| True-False | ![True-False](./assets/images/project-images/True-False.png) |
| Statistics | ![Statistics](./assets/images/project-images/stats.png) |
| Questions | ![Questions](./assets/images/project-images/Questions.png) |
| Games | ![Games](./assets/images/project-images/Enjoy.png) |

---

## Contributing

Contributions are welcome. To propose a change:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

For bugs or feature requests, please open an [issue](https://github.com/erenkirekbilek/kpss-focus/issues).

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Contact

**Eren Zirekbilek**  
- Email: erenzirekbilek@hotmail.com  
- GitHub: [@erenkirekbilek](https://github.com/erenkirekbilek)