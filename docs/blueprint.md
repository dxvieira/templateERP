# **App Name**: VisComm Command Center

## Core Features:

- Order Tracking: Real-time tracking of orders through different production stages (art, printing, finishing).
- KPI Dashboard: Display key performance indicators (KPIs) related to production in real-time, sourced from Firestore.
- Production Progress Visualization: Animated donut chart to visually represent the overall production progress.
- War Room Alerting: Highlight orders with overdue delivery dates in red for immediate attention.
- Production Feed: Display a chronologically ordered list of order status updates
- User Authentication: Secure user authentication using Firebase Authentication.
- Predictive Delay Warnings: Generative AI tool to determine whether or not orders that are currently on track will become delayed, based on production velocity metrics.

## Style Guidelines:

- Primary color: Neon Purple (#D026FF) for highlighting key elements.
- Secondary color: Orange (#FF5F1F) for actions and alerts.
- Tertiary colors: Green/Cyan for positive status indicators.
- Background color: Dark background (#121212) to enhance neon colors.
- Font: 'Inter' sans-serif, used for both body and headlines, to maintain a modern, readable design. Note: currently only Google Fonts are supported.
- Use a responsive layout with Grid/Flexbox for optimal viewing on both desktop and mobile devices.
- Cards with subtle glassmorphism effect or neon borders to fit the visual style.
- Use subtle animations with Framer Motion for smooth transitions and interactions.