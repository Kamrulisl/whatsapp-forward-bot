# WhatsApp Forwarding Bot 🤖

একটি মাল্টি-ইউজার WhatsApp ফরওয়ার্ডিং সিস্টেম যা কীওয়ার্ড ভিত্তিক মেসেজ রুটিং করে এবং টু-ওয়ে কমিউনিকেশন সমর্থন করে।

## ফিচারস

- ✅ **মাল্টি-ইউজার লগইন** - প্রতিটি ইউজার আলাদা WhatsApp অ্যাকাউন্ট লিংক করতে পারে
- ✅ **কীওয়ার্ড ভিত্তিক ফরওয়ার্ডিং** - নির্দিষ্ট কীওয়ার্ড ধরে মেসেজ ফরওয়ার্ড করুন
- ✅ **টু-ওয়ে কমিউনিকেশন** - ফরওয়ার্ড করা মেসেজের উত্তর স্বয়ংক্রিয়ভাবে মূল ইউজারে যায়
- ✅ **ওয়েব প্যানেল** - সহজ অ্যাডমিন ইন্টারফেস রুলস ম্যানেজ করার জন্য
- ✅ **QR কোড অথেনটিকেশন** - নিরাপদ WhatsApp লিংকিং
- ✅ **SQLite ডাটাবেস** - সব ডাটা স্থানীয়ভাবে সংরক্ষিত

## টেক স্ট্যাক

- **Node.js** - সার্ভার রানটাইম
- **Express.js** - ওয়েব ফ্রেমওয়ার্ক
- **Baileys** - WhatsApp API
- **SQLite3** - ডাটাবেস
- **QRCode** - QR কোড জেনারেশন

## ইনস্টলেশন

### প্রয়োজনীয় সফটওয়্যার
- Node.js v16+ 
- npm বা yarn

### সেটআপ স্টেপস

```bash
# ১. রিপোজিটরি ক্লোন করুন
git clone https://github.com/yourusername/whatsapp-forward-bot.git
cd whatsapp-forward-bot

# ২. ডিপেন্ডেন্সি ইনস্টল করুন
npm install

# ৩. সার্ভার চালান
npm start

# ডেভেলপমেন্টের জন্য (auto-reload)
npm run dev
```

## ব্যবহার

### ইউজার লগইন
1. `http://localhost:3000` খুলুন
2. "লগইন করুন" বাটনে ক্লিক করুন
3. WhatsApp-এ QR কোড স্ক্যান করুন
4. সংযোগ সফল হলে প্রস্তুত!

### অ্যাডমিন প্যানেল
1. `http://localhost:3000/admin` খুলুন
2. নতুন ফরওয়ার্ড রুল যোগ করুন (কীওয়ার্ড + নম্বর)
3. সক্রিয় ব্যবহারকারী এবং রুলস দেখুন

## API এন্ডপয়েন্ট

### লগইন এবং অথেনটিকেশন
- `POST /api/login/start` - নতুন সেশন শুরু করুন
- `GET /api/login/qr/:userId` - QR কোড পান
- `GET /api/login/status/:userId` - লগইন স্ট্যাটাস চেক করুন
- `POST /api/logout/:userId` - লগআউট করুন

### ফরওয়ার্ড রুলস
- `GET /api/rules` - সব রুলস পান
- `POST /api/rules` - নতুন রুল যোগ করুন
- `DELETE /api/rules/:keyword` - রুল মুছুন

### ব্যবহারকারী ম্যানেজমেন্ট
- `GET /api/users` - সব সংযুক্ত ব্যবহারকারী পান
- `GET /api/status` - সার্ভার স্ট্যাটাস পান

## ফাইল স্ট্রাকচার

```
whatsapp-forward-bot/
├── src/
│   ├── index.js                 # মেইন এক্সপ্রেস সার্ভার
│   ├── database/
│   │   └── db.js               # SQLite ডাটাবেস অপারেশন
│   ├── whatsapp/
│   │   ├── sessionManager.js   # মাল্টি-সেশন ম্যানেজমেন্ট
│   │   ├── forwardHandler.js   # কীওয়ার্ড এবং ফরওয়ার্ডিং লজিক
│   │   └── replyHandler.js     # উত্তর হ্যান্ডলিং
│   └── public/
│       ├── index.html          # ইউজার লগইন পেজ
│       └── admin.html          # অ্যাডমিন প্যানেল
├── sessions/                    # ইউজার সেশন ফোল্ডার (জেনারেট হয়)
├── database.db                  # SQLite ডাটাবেস (জেনারেট হয়)
├── package.json
├── .gitignore
└── README.md
```

## কীভাবে কাজ করে

### ফরওয়ার্ডিং ফ্লো
```
ইউজারের WhatsApp
    ↓
মেসেজ পাওয়া গেছে
    ↓
কীওয়ার্ড চেক করা
    ↓
কীওয়ার্ড মিলেছে? → হ্যাঁ → ফরওয়ার্ড নম্বরে পাঠান
    ↓ না
  (কিছু না করা)
```

### উত্তর ফরওয়ার্ডিং ফ্লো
```
এক্সপার্ট নম্বর থেকে উত্তর
    ↓
পেন্ডিং রিপ্লাই খোঁজা
    ↓
মূল ইউজারকে উত্তর পাঠান
    ↓
মার্ক করা: "রিপ্লাইড"
```

## ডাটাবেস টেবিল

### forward_rules
```sql
CREATE TABLE forward_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT UNIQUE,
  forward_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### pending_replies
```sql
CREATE TABLE pending_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  original_sender TEXT,
  forwarded_to TEXT,
  original_message TEXT,
  matched_keyword TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_replied BOOLEAN DEFAULT 0
);
```

### user_sessions
```sql
CREATE TABLE user_sessions (
  user_id TEXT PRIMARY KEY,
  whatsapp_number TEXT,
  status TEXT,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## সমস্যা সমাধান

### QR কোড দেখাচ্ছে না
- ব্রাউজার রিফ্রেশ করুন
- নতুন লগইন চেষ্টা করুন
- সার্ভার লগ চেক করুন

### মেসেজ ফরওয়ার্ড হচ্ছে না
- রুলস সঠিকভাবে যোগ হয়েছে কিনা চেক করুন
- কীওয়ার্ড মেসেজে আছে কিনা যাচাই করুন (কেস সেনসিটিভ নয়)
- অ্যাডমিন প্যানেলে রুল দেখা যাচ্ছে কিনা চেক করুন

### সংযোগ বিচ্ছিন্ন হচ্ছে
- ইন্টারনেট সংযোগ চেক করুন
- সার্ভার রিস্টার্ট করুন: `npm start`
- WhatsApp অ্যাপ আপডেট করুন

## লাইসেন্স

ISC

## সাপোর্ট

সমস্যার জন্য GitHub Issues খুলুন।
