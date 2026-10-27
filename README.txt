VD Finance — Final Split Project

Frontend:
- index.html — page structure only
- css/style.css — all original inline CSS, same order
- js/script-01.js ... script-07.js — original inline JavaScript kept in the same execution positions/order

Backend:
- backend/VD_Finance_AppsScript_2FA_OTP.gs — Google Apps Script backend from the 2FA OTP package

Important:
- External jsPDF, html2canvas and Razorpay script tags remain in index.html.
- No loan/business logic was intentionally redesigned during this split.
- The JS was split in-place instead of being reorganized by feature, to minimize regression risk for the final app.
- Deploy the frontend folder contents to Vercel/GitHub. Apps Script stays in Google Apps Script.
