# 🧠⚡ Brain Math Arena — MVP

Calculator / mental math games for schools. Pure HTML+CSS+JS, no backend, runs from any folder or any static host.

## 🚀 How to run
```bash
cd calculator-games
# Option 1: open index.html in browser
open index.html

# Option 2: any static server
python3 -m http.server 8080
# then open http://localhost:8080
```

**Access code:** `1234` (change in `index.html` → `const PASSWORD`)

## 🎮 Games

| Game | Players | Use case |
|---|---|---|
| ⚔️ **Speed Math Duel** | 1v1 | Two students at one keyboard. P1 types in left, P2 in right. First correct + Enter scores. Best of 10. |
| 🏆 **Team vs Team** | Classroom | Projector mode. Teacher controls. `A`/`Z` = Team A +1/−1, `L`/`M` = Team B +1/−1, `Space` = reveal answer, `Enter` = next question. |
| ⏱️ **Tables Race** | Solo | 60-second multiplication sprint. Best score saved in browser. |
| 🪜 **Mental Ladder** | Solo | Difficulty climbs every level. 3 lives. Score = level × 10. |

## 💰 Business Model (path to ₹1 Cr)

| Item | Price | Target | Yearly |
|---|---|---|---|
| Per-school license | ₹6,000–10,000/year | 500 schools | ₹30–50 L |
| Inter-school tournaments | ₹50/student | 20,000 students | ₹10 L |
| Sponsorships / banner ads | — | — | ₹5–10 L |

**Sales pitch to schools:**
- "Boost mental math + speed for ₹500/month per school"
- Demo it live in their classroom on the projector
- Free trial 1 month → annual contract

## 🛠️ Customise per school
1. Open `index.html` → change `PASSWORD = "1234"` to school code (e.g. `"GHS2026"`)
2. Update title `Brain Math Arena 🧠⚡` to school name if you want
3. Host on Netlify / Vercel / GitHub Pages (free) → give each school their own subdomain

## 📦 Folder structure
```
calculator-games/
├── index.html              # password gate + hub
├── README.md
├── assets/
│   ├── style.css           # all styles
│   └── game.js             # question generator + sounds + auth guard
└── games/
    ├── speed-duel.html
    ├── team-vs-team.html
    ├── tables-race.html
    └── mental-ladder.html
```

## 🔜 Next features (v2 ideas)
- [ ] Firebase leaderboard (inter-school)
- [ ] Tournament bracket mode
- [ ] Class/section selector
- [ ] Teacher dashboard with student stats
- [ ] Subject expansion: GK quiz, English vocab, science MCQ
- [ ] Razorpay integration for tournament fees
