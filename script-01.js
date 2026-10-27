
/* ================= VDF SINGLE-CLICK BUTTON SAFETY =================
   First click always reaches the original handler. A very fast accidental
   second click is ignored so the same action cannot be queued twice.
   This guard never waits for network/API responses and never requires a
   second click to make an action happen. */
(function installVdfSingleClickSafety() {
    var lastClick = new WeakMap();
    document.addEventListener("click", function (event) {
        var button = event.target && event.target.closest ? event.target.closest("button") : null;
        if (!button || button.disabled) return;

        var now = Date.now();
        var previous = lastClick.get(button) || 0;

        /* Ignore only an accidental rapid repeat on the SAME button. */
        if (now - previous < 500) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        /* Store the click after deciding it is valid. The original inline
           onclick / listener still runs normally on this very first click. */
        lastClick.set(button, now);
    }, true);
})();


/* =====================================================
   VD FINANCE JAVASCRIPT
   ===================================================== */



/* ================= HOME TIME GREETING ================= */
function getIndiaHour() {
    var now = new Date();
    try {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            hourCycle: "h23"
        }).formatToParts(now);
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type === "hour") return Number(parts[i].value);
        }
    } catch (e) {}
    /* IST/AP fallback: UTC + 5 hours 30 minutes; never depends on device timezone. */
    var ist = new Date(now.getTime() + 330 * 60000);
    return ist.getUTCHours();
}

function getIndiaTimeGreeting() {
    var hour = getIndiaHour();
    if (hour >= 5 && hour < 12) return "Good Morning ☀️";
    if (hour >= 12 && hour < 17) return "Good Afternoon 🌤️";
    if (hour >= 17 && hour < 20) return "Good Evening 🌆";
    return "Good Night 🌙";
}

function updateHomeGreeting() {
    var el = document.getElementById("homeTimeGreeting");
    if (!el) return;
    el.innerHTML = '<div class="vdf-greet-line">' + escapeHTML(getIndiaTimeGreeting()) + '</div><div class="vdf-greet-name">WELCOME TO VD FAMILY</div>';
}

function updateStatusTimeGreeting(name) {
    var greeting = document.getElementById("statusGreeting");
    if (!greeting) return;
    if (!name) { greeting.innerHTML = ""; return; }
    greeting.innerHTML = '<div class="vdf-greet-line">' + escapeHTML(getIndiaTimeGreeting()) + '</div><div class="vdf-greet-name">' + escapeHTML(name) + ' 😊</div>';
}

/* ================= PAGE NAVIGATION ================= */

function showPage(pageId) {

    document.body.classList.toggle("home-active", pageId === "home");

    var pages = document.querySelectorAll(".page");

    pages.forEach(function(page) {
        page.classList.remove("active");
    });

    var selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active");
        window.scrollTo(0, 0);

        if (pageId === "home") {
            selectedPage.classList.remove("home-animate");
            void selectedPage.offsetWidth;
            selectedPage.classList.add("home-animate");
        }
    }

    /*
     * Apply page is a public/shared form. Every time it is opened, start
     * with a blank customer form so the previous applicant's information
     * cannot be displayed to the next person.
     */
    if (pageId === "apply") {
        resetApplicationForm();
        var applyPopup = document.getElementById("applyMessage");
        if (applyPopup) {
            applyPopup.className = "apply-success-popup";
            applyPopup.textContent = "";
        }
    }

    /*
     * Status page is also shared. Do not carry an earlier applicant's ID or
     * result into a new visit. The customer must enter the ID themselves.
     */
    if (pageId === "status") {
        var statusIdField = document.getElementById("statusId");
        var statusResult = document.getElementById("statusResult");
        if (statusIdField) statusIdField.value = "";
        if (statusResult) statusResult.innerHTML = "";
        var statusWishZone = document.querySelector("#status .vdf-status-wish-card-zone");
        if (statusWishZone) statusWishZone.classList.remove("vdf-status-authenticated");
        var memberCardSlot = document.getElementById("vdfStatusMemberCardSlot");
        if (memberCardSlot) memberCardSlot.innerHTML = "";
        updateStatusTimeGreeting("");
    }

    if (pageId === "admin") {
        if (sessionStorage.getItem("vdfAdmin") !== "true") {
            showPage("login");
            return;
        }

        loadAdminApplications();
    }
}

updateHomeGreeting();
setInterval(updateHomeGreeting, 60000);


/* ================= MONEY FORMAT ================= */

function money(value) {

    return "₹" + Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });

}


/* ================= REPAYMENT DATE ================= */

function getRepaymentDate(days) {

    var date = new Date();
    var duration = Number(days);
    if (!Number.isFinite(duration) || duration < 1) duration = 30;
    date.setDate(date.getDate() + duration);

    var day = String(date.getDate()).padStart(2, "0");
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var year = date.getFullYear();

    return day + "/" + month + "/" + year;
}


/* ================= CALCULATOR ================= */

function toggleCalculatorDays() {
    var type = document.getElementById("calcType");
    var group = document.getElementById("calcDaysGroup");
    if (group) group.style.display = type && type.value === "daily" ? "block" : "none";
}

function clearCalculatorResult() {
    var result = document.getElementById("calculatorResult");
    var applyButton = document.getElementById("calcApplyButton");
    if (result) result.style.display = "none";
    if (applyButton) applyButton.style.display = "none";
    ["calcPrincipal", "calcInterest", "calcFee", "calcTotal", "calcRepaymentDate"].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = "";
    });
}

function calculateLoan(userInitiated) {
    var amount = Number(document.getElementById("calcAmount").value);
    var typeEl = document.getElementById("calcType");
    var type = typeEl ? typeEl.value : "monthly";
    var days = type === "daily" ? Number(document.getElementById("calcDays").value) : 30;

    if (!amount || amount < 100 || amount > 50000) {
        clearCalculatorResult();
        if (userInitiated === true) alert("Please enter a loan amount between ₹100 and ₹50,000.");
        return;
    }
    if (type === "daily" && (!Number.isInteger(days) || days < 1 || days > 15)) {
        clearCalculatorResult();
        if (userInitiated === true) alert("Day-wise loan duration must be between 1 and 15 days.");
        return;
    }

    var interest = type === "daily" ? (amount / 1000) * 69 * days : amount * 0.31;
    var fee = type === "daily" ? 0 : (amount >= 1000 ? 100 : 0);
    var total = amount + interest + fee;

    document.getElementById("calculatorResult").style.display = "block";
    document.getElementById("calcApplyButton").style.display = "inline-block";
    document.getElementById("calcRepaymentDate").textContent = getRepaymentDate(days);
    document.getElementById("calcPrincipal").textContent = money(amount);
    document.getElementById("calcInterest").textContent = money(interest);
    document.getElementById("calcFee").textContent = money(fee);
    document.getElementById("calcTotal").textContent = money(total);
}

/* ================= APPLY FROM CALCULATOR ================= */

function applyFromCalculator() {
    var amount = Number(document.getElementById("calcAmount").value);
    var type = document.getElementById("calcType") ? document.getElementById("calcType").value : "monthly";
    var period = type === "daily" ? Number(document.getElementById("calcDays").value) : 30;
    if (!amount || amount < 100 || amount > 50000) {
        alert("Please enter a loan amount between ₹100 and ₹50,000.");
        return;
    }
    if (type === "daily" && (!Number.isInteger(period) || period < 1 || period > 15)) {
        alert("Day-wise loan duration must be between 1 and 15 days.");
        return;
    }
    /* Open Apply first because showPage("apply") intentionally resets the shared
       application form. Then transfer the calculator amount and period so they remain visible. */
    showPage("apply");
    document.getElementById("appAmount").value = amount;
    document.getElementById("appPeriod").value = String(period);
    calculateApplication();
    clearCalculatorResult();
    var calcAmountField = document.getElementById("calcAmount");
    if (calcAmountField) calcAmountField.value = "";
    var calcTypeField = document.getElementById("calcType");
    if (calcTypeField) calcTypeField.value = "monthly";
    var calcDaysField = document.getElementById("calcDays");
    if (calcDaysField) calcDaysField.value = "15";
    toggleCalculatorDays();
}

/* ================= APPLICATION CALCULATOR ================= */

function calculateApplication() {

    var amount = Number(document.getElementById("appAmount").value);

    var repaymentSummary = document.getElementById("appRepaymentSummary");

    if (!amount || amount < 100 || amount > 50000) {
        if (repaymentSummary) repaymentSummary.style.display = "none";
        var result = document.querySelector("#appAmount");
        var principal = document.getElementById("appPrincipal");
        var interest = document.getElementById("appInterest");
        var fee = document.getElementById("appFee");
        var total = document.getElementById("appTotal");
        var repayment = document.getElementById("appRepaymentDate");

        if (principal) principal.textContent = "";
        if (interest) interest.textContent = "";
        if (fee) fee.textContent = "";
        if (total) total.textContent = "";
        if (repayment) repayment.textContent = "";
        return;
    }

    if (repaymentSummary) repaymentSummary.style.display = "block";

    var periodValue = Number(document.getElementById("appPeriod").value) || 30;
    if (periodValue !== 30 && (periodValue < 1 || periodValue > 15)) {
        if (repaymentSummary) repaymentSummary.style.display = "none";
        return;
    }
    var isDailyLoan = periodValue < 30;
    var interestAmount = isDailyLoan ? (amount / 1000) * 69 * periodValue : amount * 0.31;
    var feeAmount = isDailyLoan ? 0 : (amount >= 1000 ? 100 : 0);
    var totalAmount = amount + interestAmount + feeAmount;

    document.getElementById("appRepaymentDate").textContent = getRepaymentDate(periodValue);
    document.getElementById("appPrincipal").textContent = money(amount);
    document.getElementById("appInterest").textContent = money(interestAmount);
    document.getElementById("appFee").textContent = money(feeAmount);
    document.getElementById("appTotal").textContent = money(totalAmount);
}


/* ================= GOOGLE SHEET SYNC ================= */

/*
  After deploying the Google Apps Script Web App, paste its /exec URL here.
  Example:
  const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw5DerC_6LCJMS5BRAYL5EoNnKYsCvYXj946wMY5wcieFVq8Ckm31rmS8_kt1jxjReUnQ/exec";
*/
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw5DerC_6LCJMS5BRAYL5EoNnKYsCvYXj946wMY5wcieFVq8Ckm31rmS8_kt1jxjReUnQ/exec";

function deleteExactLoanFromGoogleSheet(applicationId, loanIndex) {
    if (!GOOGLE_SHEET_WEB_APP_URL) return Promise.reject(new Error('Backend URL missing'));
    return fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'deleteLoan',
            adminToken: sessionStorage.getItem('vdfAdminToken') || '',
            loanIndex: Number(loanIndex),
            application: { id: String(applicationId || '') }
        })
    }).then(function(response) {
        if (!response.ok) throw new Error('Backend HTTP ' + response.status);
        return response.json();
    }).then(function(result) {
        if (!result || result.success !== true) throw new Error((result && result.error) || 'Loan delete failed');
        return result;
    });
}

function syncToGoogleSheet(action, application) {
    if (!GOOGLE_SHEET_WEB_APP_URL || GOOGLE_SHEET_WEB_APP_URL.indexOf("PASTE_YOUR_") === 0) {
        return;
    }

    var data = {
        action: action,
        adminToken: sessionStorage.getItem('vdfAdminToken') || '',
        application: {
            id: application.id || "",
            name: application.name || "",
            mobile: application.mobile || "",
            coApplicant: application.coApplicant || "",
            email: application.email || "",
            upiId: application.upiId || "",
            loanHistory: application.loanHistory || [],
            adminNote: application.adminNote || "",
            loanReason: application.loanReason || "",
            address: application.address || "",
            aadhaarFileName: application.aadhaarFileName || "",
            aadhaarFileId: application.aadhaarFileId || "",
            /* Send the actual file data only with the initial pending/create request.
               The Apps Script stores it as a private Google Drive file. */
            aadhaarFileData: (action === "pending" || action === "create") &&
                typeof application.aadhaarFile === "string" && application.aadhaarFile.indexOf("data:") === 0
                ? application.aadhaarFile : "",
            amount: Number(application.amount) || 0,
            period: Number(application.period) || 0,
            interest: Number(application.interest) || 0,
            fee: Number(application.fee) || 0,
            total: Number(application.total) || 0,
            repaymentDate: application.repaymentDate || "",
            status: application.status || "",
            userAccess: application.userAccess !== false,
            createdAt: application.createdAt || "",
            lastUpdated: new Date().toISOString(),
            sendExistingCustomerEmail: action === "existingCustomer"
        }
    };

    return fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
    }).catch(function(error) {
        console.warn("Google Sheet sync failed:", error);
        return null;
    });
}



/* ================= SHARED BACKEND DATA ================= */

function normalizeVdfServerLoanHistory(serverApplication) {
    var serverHistory = serverApplication && Array.isArray(serverApplication.loanHistory)
        ? serverApplication.loanHistory : [];
    return serverHistory.map(function(loan, index) {
        return Object.assign({}, loan, { loanNumber: index + 1 });
    });
}

/*
  IMPORTANT DATA RULE:
  Google Sheet / Apps Script is the single source of truth.
  LocalStorage is only an offline/cache copy. Server loanHistory always REPLACES
  the local loanHistory; deleted server loans must never be merged back in.
*/
function mergeVdfLoanHistory(localApplication, serverApplication) {
    return normalizeVdfServerLoanHistory(serverApplication);
}

function mergeVdfApplicationWithLocalHistory(serverApplication) {
    if (!serverApplication) return null;
    return Object.assign({}, serverApplication, {
        loanHistory: normalizeVdfServerLoanHistory(serverApplication)
    });
}

function getVdfRestoredAccountCache() {
    try { return JSON.parse(localStorage.getItem("vdfRestoredAccounts") || "[]"); }
    catch (e) { return []; }
}
function saveVdfRestoredAccountCache(items) {
    localStorage.setItem("vdfRestoredAccounts", JSON.stringify(items));
}
function mergeVdfApplicationListWithLocalHistory(serverApplications) {
    var serverList = Array.isArray(serverApplications) ? serverApplications : [];
    /* Never re-add locally restored/deleted customers over backend truth. */
    try { localStorage.removeItem("vdfRestoredAccounts"); } catch (e) {}
    return serverList.map(function(serverApplication) {
        return mergeVdfApplicationWithLocalHistory(serverApplication);
    });
}

function fetchSharedApplications() {
    if (!GOOGLE_SHEET_WEB_APP_URL) return Promise.resolve(null);

    var url = GOOGLE_SHEET_WEB_APP_URL +
        "?action=getApplications&_=" + Date.now();

    return fetch(url, { method: "GET", cache: "no-store" })
        .then(function(response) {
            if (!response.ok) throw new Error("Backend HTTP " + response.status);
            return response.json();
        })
        .then(function(data) {
            if (!data || data.success !== true || !Array.isArray(data.applications)) {
                throw new Error("Invalid backend response");
            }

            var mergedApplications = mergeVdfApplicationListWithLocalHistory(data.applications);
            /* Full replacement: backend list wins, including deletions. */
            saveLoans(mergedApplications);

            if (data.dashboardData && typeof data.dashboardData === "object") {
                saveDashboardData(data.dashboardData);
            }

            return mergedApplications;
        })
        .catch(function(error) {
            console.warn("Shared VDF data fetch failed; using local cache:", error);
            return null;
        });
}

function replaceCachedApplicationFromServer(serverApplication, wantedId) {
    var wanted = String(wantedId || (serverApplication && serverApplication.id) || "").trim().toUpperCase();
    var cached = getLoans().filter(function(item) {
        return String(item.id || "").trim().toUpperCase() !== wanted;
    });
    if (serverApplication) cached.push(mergeVdfApplicationWithLocalHistory(serverApplication));
    saveLoans(cached);
    return serverApplication ? mergeVdfApplicationWithLocalHistory(serverApplication) : null;
}

function fetchSharedApplicationById(id) {
    var wanted = String(id || "").trim().toUpperCase();
    if (!wanted || !GOOGLE_SHEET_WEB_APP_URL) return Promise.resolve(null);

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 8000) : null;
    var url = GOOGLE_SHEET_WEB_APP_URL +
        "?action=getApplicationById&id=" + encodeURIComponent(wanted) +
        "&_ts=" + Date.now();

    return fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller ? controller.signal : undefined
    })
    .then(function(response) {
        if (!response.ok) throw new Error("Backend HTTP " + response.status);
        return response.json();
    })
    .then(function(data) {
        if (!data || data.success !== true) throw new Error("Invalid status response");

        /*
           Some older Apps Script deployments do not have the
           getApplicationById action yet and return only the normal
           applications response. Never fall back to stale localStorage
           in that case. Use the shared application list instead.
        */
        if (data.application) return replaceCachedApplicationFromServer(data.application, wanted);

        if (Array.isArray(data.applications)) {
            var foundApplication = data.applications.find(function(item) {
                return String(item.id || "").trim().toUpperCase() === wanted;
            }) || null;
            return replaceCachedApplicationFromServer(foundApplication, wanted);
        }

        return fetchSharedApplications().then(function(applications) {
            if (!Array.isArray(applications)) return null;
            var fallbackApplication = applications.find(function(item) {
                return String(item.id || "").trim().toUpperCase() === wanted;
            }) || null;
            return replaceCachedApplicationFromServer(fallbackApplication, wanted);
        });
    })
    .catch(function(error) {
        console.warn("Fast status lookup failed; using shared-list fallback:", error);
        return fetchSharedApplications().then(function(applications) {
            if (!Array.isArray(applications)) return null;
            var fallbackApplication = applications.find(function(item) {
                return String(item.id || "").trim().toUpperCase() === wanted;
            }) || null;
            return replaceCachedApplicationFromServer(fallbackApplication, wanted);
        }).catch(function(fallbackError) {
            console.warn("Shared status fallback failed:", fallbackError);
            return null;
        });
    })
    .finally(function() {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

function syncDashboardEventToBackend(loan, status) {
    if (!loan || !GOOGLE_SHEET_WEB_APP_URL) return Promise.resolve(false);

    var payload = {
        action: "dashboardEvent",
        loan: {
            dashboardEntryId: loan.dashboardEntryId || "",
            amount: Number(loan.amount) || 0,
            interest: Number(loan.interest) || 0,
            fee: Number(loan.fee) || 0,
            total: Number(loan.total) || 0,
            createdAt: loan.createdAt || ""
        },
        status: status || loan.status || ""
    };

    return fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).then(function() { return true; })
      .catch(function(error) {
          console.warn("Dashboard backend sync failed:", error);
          return false;
      });
}

function syncDashboardEditToBackend(monthKey, metric, value) {
    if (!GOOGLE_SHEET_WEB_APP_URL) return Promise.resolve(false);

    return fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "dashboardEdit",
            monthKey: monthKey,
            metric: metric,
            value: Number(value) || 0
        })
    }).then(function() { return true; })
      .catch(function(error) {
          console.warn("Dashboard edit sync failed:", error);
          return false;
      });
}

/* ================= STORAGE ================= */

function getLoans() {

    var data = localStorage.getItem("vdfLoans");

    if (!data) {
        return [];
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}


function saveLoans(loans) {

    localStorage.setItem("vdfLoans", JSON.stringify(loans));

}

/* Local storage is a cache; customer status reads must prefer the shared backend. */

/* ================= APPLICATION ID ================= */

function generateApplicationId() {

    var randomNumber = Math.floor(100000 + Math.random() * 900000);

    return "VD-" + randomNumber;
}


/* ================= SUBMIT LOAN ================= */

function submitLoan() {

    var name = document.getElementById("appName").value.trim();
    var mobile = document.getElementById("appMobile").value.trim();
    var coApplicant = document.getElementById("appCoApplicant").value.trim();
    var email = document.getElementById("appEmail").value.trim();
    var upiId = document.getElementById("appUpiId").value.trim();
    var loanReason = document.getElementById("appLoanReason").value.trim();
    var address = document.getElementById("appAddress").value.trim();
    var aadhaarFile = document.getElementById("appAadhaar").files[0];
    var amount = Number(document.getElementById("appAmount").value);
    var period = Number(document.getElementById("appPeriod").value);

    var message = document.getElementById("applyMessage");

    message.className = "alert";
    message.textContent = "";

    if (!document.getElementById("applicationAcknowledgement").checked) {
        showMessage(message, "Please tick the acknowledgement checkbox before submitting the application.", "error");
        return;
    }

    if (name.length < 2) {
        showMessage(message, "Please enter your full name.", "error");
        return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
        showMessage(message, "Please enter a valid 10-digit mobile number.", "error");
        return;
    }

    if (coApplicant && !/^[0-9]{10}$/.test(coApplicant)) {
        showMessage(message, "Please enter a valid 10-digit co-applicant number.", "error");
        return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage(message, "Please enter a valid email address.", "error");
        return;
    }

    if (!upiId) {
        showMessage(message, "Please enter your UPI ID.", "error");
        return;
    }

    if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(upiId)) {
        showMessage(message, "Please enter a valid UPI ID.", "error");
        return;
    }

    if (loanReason.length < 2) {
        showMessage(message, "Please enter the reason for taking the loan.", "error");
        return;
    }

    if (address.length < 5) {
        showMessage(message, "Please enter your full address.", "error");
        return;
    }

    if (!aadhaarFile) {
        showMessage(message, "Please upload your Aadhaar card.", "error");
        return;
    }

    if (aadhaarFile.size > 2 * 1024 * 1024) {
        showMessage(message, "Aadhaar card file must be 2MB or less.", "error");
        return;
    }

    if (amount < 100 || amount > 50000) {
        showMessage(message, "Loan amount must be between ₹100 and ₹50,000.", "error");
        return;
    }

    if (period !== 30 && (!Number.isInteger(period) || period < 1 || period > 15)) {
        showMessage(message, "Choose Monthly (30 days) or a Day-wise period between 1 and 15 days.", "error");
        return;
    }

    var interest = period < 30 ? (amount / 1000) * 69 * period : amount * 0.31;
    var fee = period < 30 ? 0 : (amount >= 1000 ? 100 : 0);
    var total = amount + interest + fee;
    var repaymentDate = getRepaymentDate(period);

    var loans = getLoans();

    /* Same customer = same mobile number AND same name words (order-independent).
       Example: "Jaya Prakash Gantasala" and "Gantasala Jaya Prakash" are the same name.
       Email/address changes do not create a new customer ID.
       If the name OR mobile number is different, create a new Application ID. */
    function normalizeCustomerName(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .filter(Boolean)
            .sort()
            .join(" ");
    }

    var normalizedName = normalizeCustomerName(name);
    var normalizedMobile = String(mobile || "").replace(/\D/g, "");

    /*
       CUSTOMER MATCH RULE:
       Same mobile number = SAME CUSTOMER / SAME APPLICATION ID.
       If the same mobile applies again, keep the same Application ID
       and create the next loan number (Loan 2, Loan 3, ...).
       Name, email and address are not required for the match.
    */
    var existingIndex = normalizedMobile
        ? loans.findIndex(function(item) {
            var savedMobile = String(item.mobile || "").replace(/\D/g, "");
            return savedMobile === normalizedMobile;
        })
        : -1;

    var existingApplication = existingIndex >= 0 ? loans[existingIndex] : null;

    var transaction = {
        loanNumber: existingApplication && existingApplication.loanHistory
            ? existingApplication.loanHistory.length + 1
            : 1,
        amount: amount,
        period: period,
        interest: interest,
        fee: fee,
        total: total,
        repaymentDate: repaymentDate,
        status: "Pending",
        createdAt: new Date().toLocaleString()
    };

    var application;

    if (existingApplication) {
        application = existingApplication;

        if (!Array.isArray(application.loanHistory)) {
            application.loanHistory = [{
                loanNumber: 1,
                amount: Number(application.amount) || 0,
                period: Number(application.period) || 30,
                interest: Number(application.interest) || 0,
                fee: Number(application.fee) || 100,
                total: Number(application.total) || 0,
                repaymentDate: application.repaymentDate || getRepaymentDateFromCreatedAt(application.createdAt, application.period),
                status: application.status || "Pending",
                createdAt: application.createdAt || ""
            }];
        }

        transaction.loanNumber = application.loanHistory.length + 1;
        application.loanHistory.push(transaction);

        application.name = name;
        application.mobile = mobile;
        application.coApplicant = coApplicant;
        application.email = email;
        application.upiId = upiId;
        application.loanReason = loanReason;
        application.address = address;
        application.aadhaarFileName = aadhaarFile.name;

        /* Keep the latest loan in the main summary fields. */
        application.amount = amount;
        application.period = period;
        application.interest = interest;
        application.fee = fee;
        application.total = total;
        application.repaymentDate = repaymentDate;
        application.status = "Pending";
        application.userAccess = true;

        existingIndex = existingIndex;
    } else {
        application = {
            id: generateApplicationId(),
            name: name,
            mobile: mobile,
            coApplicant: coApplicant,
            email: email,
            upiId: upiId,
            loanReason: loanReason,
            address: address,
            aadhaarFileName: aadhaarFile.name,
            amount: amount,
            period: period,
            interest: interest,
            fee: fee,
            total: total,
            repaymentDate: repaymentDate,
            status: "Pending",
            userAccess: true,
            createdAt: new Date().toLocaleString(),
            adminNote: "",
            loanHistory: [transaction]
        };

        loans.push(application);
        existingIndex = loans.length - 1;
    }

    var reader = new FileReader();

    reader.onload = function () {
        /* Keep Aadhaar only on the customer record; each loan transaction does not duplicate it. */
        application.aadhaarFile = reader.result;

        saveLoans(loans);

        /* Keep a new application in the admin pending queue only.
           It is NOT written to the Google Sheet until Admin approves it. */
        syncToGoogleSheet("pending", application);

        /* Send the application-received email directly through the Apps Script email API. */
        sendApplicationReceivedEmail(application, transaction);

        /*
         * Show the Application ID once, then leave the Apply page completely
         * clean.  Do NOT copy the submitted ID into the Status page because
         * another person may use this same browser/device next.
         */
        resetApplicationForm();
        clearCalculatorResult();
        var calcAmountAfterSubmit = document.getElementById("calcAmount");
        if (calcAmountAfterSubmit) calcAmountAfterSubmit.value = "";

        /* Show confirmation only below the Submit Application button. */
        var successPopup = document.getElementById("applyMessage");
        if (successPopup) {
            successPopup.textContent =
                "Thank you for choosing VD Finance! Your application has been submitted successfully. Application ID: " + application.id;
            successPopup.className = "apply-success-popup show";

            clearTimeout(window.vdfApplyPopupTimer);
            window.vdfApplyPopupTimer = setTimeout(function () {
                successPopup.className = "apply-success-popup";
                successPopup.textContent = "";
            }, 5000);
        }

        /* Always keep the separate Status page blank for the next person. */
        var statusIdField = document.getElementById("statusId");
        var statusResult = document.getElementById("statusResult");
        if (statusIdField) statusIdField.value = "";
        if (statusResult) statusResult.innerHTML = "";
    };

    reader.readAsDataURL(aadhaarFile);
}


/* ================= RESET APPLY FORM ================= */

function resetApplicationForm() {

    clearTimeout(window.vdfApplyPopupTimer);

    var fields = [
        "appName",
        "appMobile",
        "appCoApplicant",
        "appEmail",
        "appUpiId",
        "appAddress"
    ];

    fields.forEach(function(id) {
        var field = document.getElementById(id);
        if (field) field.value = "";
    });

    var reason = document.getElementById("appLoanReason");
    if (reason) reason.value = "";

    var aadhaar = document.getElementById("appAadhaar");
    if (aadhaar) aadhaar.value = "";

    var acknowledgement = document.getElementById("applicationAcknowledgement");
    if (acknowledgement) acknowledgement.checked = false;

    var message = document.getElementById("applyMessage");
    if (message) {
        message.textContent = "";
        message.className = "apply-success-popup";
    }

    /* Reset calculated values completely so the next person sees a blank form. */
    var amount = document.getElementById("appAmount");
    if (amount) amount.value = "";

    var period = document.getElementById("appPeriod");
    if (period) period.value = "30";

    var principal = document.getElementById("appPrincipal");
    var interest = document.getElementById("appInterest");
    var fee = document.getElementById("appFee");
    var total = document.getElementById("appTotal");
    var repayment = document.getElementById("appRepaymentDate");

    if (principal) principal.textContent = "";
    if (interest) interest.textContent = "";
    if (fee) fee.textContent = "";
    if (total) total.textContent = "";
    if (repayment) repayment.textContent = "";

    var repaymentSummary = document.getElementById("appRepaymentSummary");
    if (repaymentSummary) repaymentSummary.style.display = "none";
}


/* ================= MESSAGE ================= */

function showMessage(element, text, type) {

    element.textContent = text;
    element.className = "alert " + type;

}


/* ================= STATUS CHECK ================= */

function formatVdfDate(value) {
    if (value === null || value === undefined || value === "") return "Not set";

    if (Object.prototype.toString.call(value) === "[object Date]") {
        if (isNaN(value.getTime())) return "Not set";
        return String(value.getDate()).padStart(2, "0") + "/" +
               String(value.getMonth() + 1).padStart(2, "0") + "/" +
               value.getFullYear();
    }

    var text = String(value).trim();

    /* Already in DD/MM/YYYY format. */
    var match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        return String(match[1]).padStart(2, "0") + "/" +
               String(match[2]).padStart(2, "0") + "/" +
               match[3];
    }

    /*
     * Convert Date strings such as:
     * Fri Oct 30 2026 00:00:00 GMT+0530 (India Standard Time)
     * to date-only. The timezone name is never displayed.
     */
    var d = new Date(text);
    if (!isNaN(d.getTime())) {
        return String(d.getDate()).padStart(2, "0") + "/" +
               String(d.getMonth() + 1).padStart(2, "0") + "/" +
               d.getFullYear();
    }

    /* Fallback for ISO-like date text. */
    var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        return String(iso[3]).padStart(2, "0") + "/" +
               String(iso[2]).padStart(2, "0") + "/" +
               iso[1];
    }

    return "Not set";
}

function getRepaymentDateFromCreatedAt(createdAt, period) {

    var created = new Date(createdAt);

    if (isNaN(created.getTime())) {
        created = new Date();
    }

    var duration = Number(period);
    if (!Number.isFinite(duration) || duration < 1) duration = 30;
    created.setDate(created.getDate() + duration);

    return String(created.getDate()).padStart(2, "0") + "/" +
           String(created.getMonth() + 1).padStart(2, "0") + "/" +
           created.getFullYear();
}


function getDaysUntilDue(repaymentDate) {

    if (!repaymentDate) return null;

    var parts = repaymentDate.split("/");
    if (parts.length !== 3) return null;

    var due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}


/* ================= APPLICATION STATUS ================= */

function updateStatusGreeting(name) {
    updateStatusTimeGreeting(name);
}


function ensureLoanHistory(application) {

    if (!Array.isArray(application.loanHistory) || application.loanHistory.length === 0) {
        application.loanHistory = [{
            loanNumber: 1,
            amount: Number(application.amount) || 0,
            period: Number(application.period) || 30,
            interest: Number(application.interest) || 0,
            fee: Number(application.fee) || 100,
            total: Number(application.total) || 0,
            repaymentDate: application.repaymentDate || getRepaymentDateFromCreatedAt(application.createdAt, application.period),
            status: application.status || "Pending",
            createdAt: application.createdAt || ""
        }];
    }

    return application.loanHistory;
}

function formatAdminRepaymentDate(value) {
    if (!value) return "";

    var text = String(value).trim();

    // Keep an already stored DD/MM/YYYY value exactly as a date only.
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
        var parts = text.split("/");
        return String(parts[0]).padStart(2, "0") + "/" +
               String(parts[1]).padStart(2, "0") + "/" + parts[2];
    }

    // If a Date/time value reaches the Admin table, deliberately display
    // only the Indian date; never show IST/GMT/time text.
    var date = new Date(text);
    if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Kolkata"
        }).format(date);
    }

    // Remove any accidental time/timezone suffix as a safe fallback.
    return text.split(/\s+(?:at|GMT|IST|\+\d{2}:?\d{2})/i)[0].trim();
}

function getLoanDueText(repaymentDate) {

    var formattedDate = formatVdfDate(repaymentDate);

    if (formattedDate === "Not set") return "Due date not available";

    var days = getDaysUntilDue(formattedDate);

    if (days === null) return "Due date not available";

    if (days > 0) return days + " Days";
    if (days === 0) return "Today";

    return "Overdue by " + Math.abs(days) + " Days";
}

function getLoanStatusClass(status) {
    var value = String(status || "Pending").trim().toLowerCase();
    if (value === "approved") return "active";
    return value.replace(/\s+/g, "-");
}

function getLoanStatusDisplay(status) {
    return String(status || "Pending").trim().toLowerCase() === "approved" ? "Active" : String(status || "Pending");
}

function showCustomerAdminPopup(note) {

    note = String(note || "").trim();
    if (!note) return;

    var overlay = document.getElementById("customerAdminPopup");
    var text = document.getElementById("customerAdminPopupText");

    /* The popup must be visible on the customer's device even when the
       Status result was just replaced by the latest backend response. */
    if (!overlay || !text) {
        console.warn("VD Finance customer popup elements are not available yet.");
        return;
    }

    text.textContent = note;
    overlay.style.display = "flex";
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
    overlay.setAttribute("aria-hidden", "false");

    /* Bring it above every Status-page element after the page has rendered. */
    if (overlay.parentNode !== document.body) {
        document.body.appendChild(overlay);
    }

    if (window.requestAnimationFrame) {
        requestAnimationFrame(function() {
            overlay.style.display = "flex";
            overlay.style.visibility = "visible";
            overlay.style.opacity = "1";
        });
    }
}

function closeCustomerAdminPopup() {

    var overlay = document.getElementById("customerAdminPopup");

    if (overlay) {
        overlay.style.display = "none";
    }

    /* One-time status popup: remove it after the customer closes it. */
    var statusIdElement = document.getElementById("statusId");
    var statusId = statusIdElement ? statusIdElement.value.trim().toUpperCase() : "";
    if (statusId) {
        var loans = getLoans();
        var index = loans.findIndex(function(item) {
            return String(item.id || "").toUpperCase() === statusId;
        });
        if (index !== -1 && loans[index].statusPopup) {
            delete loans[index].statusPopup;
            saveLoans(loans);
        }
    }
}

/* ================= SHARED CUSTOMER STATUS ================= */

/*
   Customer status is shared/server-backed. localStorage is only a fast
   cache; it must never permanently override the status stored by Admin.
*/
function refreshCustomerStatusFromServer() {
    var statusPage = document.getElementById("status");
    var statusIdField = document.getElementById("statusId");
    if (!statusPage || !statusPage.classList.contains("active") || !statusIdField) return;

    /* Do not make background requests while the customer is still typing.
       Start live refresh only after Check Status has been pressed. */
    if (!window.vdfStatusHasChecked) return;
    var id = statusIdField.value.trim().toUpperCase();
    if (!id || id !== window.vdfCheckedStatusId || window.vdfStatusRefreshBusy) return;

    window.vdfStatusRefreshBusy = true;
    fetchSharedApplicationById(id)
        .then(function(latest) {
            if (!latest) return;
            var currentLoans = getLoans();
            var merged = currentLoans.filter(function(item) {
                return String(item.id || "").trim().toUpperCase() !== id;
            });
            merged.push(latest);
            saveLoans(merged);
            var fingerprint = JSON.stringify(latest);
            if (window.vdfLastStatusFingerprint !== fingerprint) {
                window.vdfLastStatusFingerprint = fingerprint;
                renderStatusFromLocal();
            }
        })
        .catch(function(error) {
            console.warn("Customer status refresh failed:", error);
        })
        .finally(function() {
            window.vdfStatusRefreshBusy = false;
        });
}

/* Refresh only the status the customer explicitly checked. */
if (!window.vdfCustomerStatusRefreshTimer) {
    window.vdfCustomerStatusRefreshTimer = setInterval(function() {
        refreshCustomerStatusFromServer();
    }, 12000);
}

function refreshCustomerStatusNow() {
    var field = document.getElementById("statusId");
    var result = document.getElementById("statusResult");
    var button = document.getElementById("statusRefreshButton");
    var id = field ? field.value.trim().toUpperCase() : "";

    if (!id) {
        if (result) result.innerHTML = '<div class="alert error">Please enter your application ID first.</div>';
        if (field) field.focus();
        return;
    }

    /* First lookup uses the same server-only path as Check Status. */
    if (!window.vdfStatusHasChecked || window.vdfCheckedStatusId !== id) {
        checkStatus();
        return;
    }
    if (window.vdfStatusRefreshBusy) return;

    window.vdfStatusRefreshBusy = true;
    if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.dataset.originalText = button.dataset.originalText || button.textContent;
        button.textContent = "Refreshing...";
    }

    fetchSharedApplicationById(id).then(function(latest) {
        if (!latest) throw new Error("Latest shared status is unavailable");
        var currentLoans = getLoans();
        var merged = currentLoans.filter(function(item) {
            return String(item.id || "").trim().toUpperCase() !== id;
        });
        merged.push(latest);
        saveLoans(merged);
        window.vdfLastStatusFingerprint = JSON.stringify(latest);
        renderStatusFromLocal();
    }).catch(function(error) {
        console.warn("Manual customer status refresh failed:", error);
        /* Keep Refresh responsive even when the shared backend is temporarily unavailable. */
        renderStatusFromLocal();
        if (result) {
            var existingError = result.querySelector(".vdf-refresh-error");
            if (!existingError) {
                result.insertAdjacentHTML("afterbegin", '<div class="alert error vdf-refresh-error">Latest server status could not be reached. Showing the saved status.</div>');
            }
        }
    }).finally(function() {
        window.vdfStatusRefreshBusy = false;
        if (button) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.textContent = button.dataset.originalText || "↻ Refresh Status";
        }
    });
}

function checkStatus() {
    var statusIdField = document.getElementById("statusId");
    var result = document.getElementById("statusResult");
    var button = document.querySelector('#status .btn-primary');
    if (!statusIdField) return;

    var id = statusIdField.value.trim().toUpperCase();
    if (!id) {
        if (result) result.innerHTML = '<div class="alert error">Please enter your application ID.</div>';
        return;
    }

    window.vdfStatusHasChecked = true;
    window.vdfCheckedStatusId = id;
    var statusIdGroup = statusIdField.closest ? statusIdField.closest(".form-group") : null;
    if (statusIdGroup) statusIdGroup.classList.add("vdf-id-loading");

    /* IMPORTANT: Never display cached/local status first.
       The customer must see the latest shared backend record only after
       Check Status has fetched it successfully. This prevents an old
       Pending/Approved value on one device from being shown temporarily. */
    if (result) {
        result.innerHTML = '<div class="alert" role="status" aria-live="polite" style="display:block;"><span class="vdf-loading-spinner" aria-hidden="true"></span> Checking latest application status…</div>';
    }

    if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.dataset.originalText = button.dataset.originalText || button.textContent;
        button.textContent = "Checking...";
    }

    fetchSharedApplicationById(id).then(function(sharedApplication) {
        if (!sharedApplication) {
            if (result) result.innerHTML = '<div class="alert error">Application not found or latest data is unavailable. Please try again.</div>';
            return;
        }

        var currentLoans = getLoans();
        var merged = currentLoans.filter(function(item) {
            return String(item.id || "").trim().toUpperCase() !== id;
        });
        merged.push(sharedApplication);
        saveLoans(merged);

        window.vdfLastStatusFingerprint = JSON.stringify(sharedApplication);
        renderStatusFromLocal();
    }).catch(function(error) {
        console.warn("Latest customer status lookup failed:", error);
        if (result) result.innerHTML = '<div class="alert error">Latest status could not be loaded. Please try again.</div>';
    }).finally(function() {
        if (statusIdGroup) statusIdGroup.classList.remove("vdf-id-loading");
        if (button) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.textContent = button.dataset.originalText || "Check Status";
        }
    });
}

function animateStatusNumbers(root) {
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll(".status-animated-number") : [];
    nodes.forEach(function(node) {
        var target = Number(node.getAttribute("data-number") || 0);
        var prefix = node.getAttribute("data-prefix") || "";
        var format = node.getAttribute("data-format") || "integer";
        var duration = Math.min(2600, Math.max(1500, 1500 + Math.abs(target) * 0.035));
        var start = performance.now();
        function ease(t){ return 1 - Math.pow(1 - t, 3); }
        function frame(now){
            var progress = Math.min(1, (now - start) / duration);
            var value = target * ease(progress);
            if (format === "money") value = Math.round(value).toLocaleString("en-IN");
            else value = Math.round(value).toLocaleString("en-IN");
            node.textContent = prefix + value;
            if (progress < 1) requestAnimationFrame(frame);
            else {
                node.textContent = prefix + (format === "money" ? Math.round(target).toLocaleString("en-IN") : Math.round(target).toLocaleString("en-IN"));
                node.classList.remove("status-number-pop");
                void node.offsetWidth;
                node.classList.add("status-number-pop");
            }
        }
        requestAnimationFrame(frame);
    });
}

function renderStatusFromLocal() {

    var id = document.getElementById("statusId").value.trim().toUpperCase();
    var result = document.getElementById("statusResult");

    if (!id) {
        var statusWishZone = document.querySelector("#status .vdf-status-wish-card-zone");
        if (statusWishZone) statusWishZone.classList.remove("vdf-status-authenticated");
        var memberCardSlot = document.getElementById("vdfStatusMemberCardSlot");
        if (memberCardSlot) memberCardSlot.innerHTML = "";
        updateStatusTimeGreeting("");

        result.innerHTML =
            '<div class="alert error">Please enter your application ID.</div>';

        return;
    }

    var loans = getLoans();

    var application = loans.find(function(item) {
        return String(item.id || "").toUpperCase() === id;
    });

    if (!application) {
        var statusWishZone = document.querySelector("#status .vdf-status-wish-card-zone");
        if (statusWishZone) statusWishZone.classList.remove("vdf-status-authenticated");
        var memberCardSlot = document.getElementById("vdfStatusMemberCardSlot");
        if (memberCardSlot) memberCardSlot.innerHTML = "";
        updateStatusTimeGreeting("");
        result.innerHTML =
            '<div class="alert error">Application not found.</div>';

        return;
    }

    var history = ensureLoanHistory(application);

    /* Keep the latest backend-verified customer record available for the statement PDF. */
    window.vdfCurrentStatementApplication = application;
    updateStatusGreeting(application.name);
    var vdfWishZone=document.querySelector("#status .vdf-status-wish-card-zone");
    if(vdfWishZone)vdfWishZone.classList.add("vdf-status-authenticated");

    /* Only Approved loans are active. Pending loans must not appear as active until admin approves them. */
    var activeLoans = history.filter(function(loan) {
        return String(loan.status || "").trim().toLowerCase() === "approved";
    });

    var totalBorrowed = history.reduce(function(sum, loan) {
        return sum + (Number(loan.amount) || 0);
    }, 0);

    var outstanding = history.reduce(function(sum, loan) {
        if (String(loan.status || "").trim().toLowerCase() === "approved") {
            return sum + vdfExactLoanPayable(loan);
        }
        return sum;
    }, 0);

    var amountClearedTotal = history.reduce(function(sum, loan) {
        var sk = String(loan.status || "").trim().toLowerCase();
        /* Always use the latest edited Part Payment record when available, so Status
           Amount Cleared changes immediately when Amount Paid is corrected. */
        var paid = Math.max(0, Number(loan.amountPaid || loan.totalPaid || 0));
        var buh = Array.isArray(loan.balanceUpdateHistory) ? loan.balanceUpdateHistory : [];
        if (buh.length) {
            var lastBU = buh[buh.length - 1] || {};
            if (String(lastBU.type || '').toLowerCase() === 'part payment') {
                paid = Math.max(0, Number(lastBU.previousPaid || 0) + Number(lastBU.paidNow || 0));
            }
        }
        if (sk === "amount cleared" || sk === "amount-cleared" || sk === "cleared") {
            var clearedBase = Math.max(paid, Number(loan.originalFullAmount || 0), Number(loan.originalTotal || 0), Number(loan.amount || 0));
            return sum + clearedBase;
        }
        return sum + paid;
    }, 0);

    var historyHtml = history.map(function(loan, index) {

        var loanStatusKey = String(loan.status || "").trim().toLowerCase();
        var isApproved = loanStatusKey === "approved";
        var isCleared = loanStatusKey === "amount cleared" || loanStatusKey === "amount-cleared" || loanStatusKey === "cleared";
        var isRejected = loanStatusKey === "rejected";
        var dueDate = isApproved
            ? formatVdfDate(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period))
            : "";
        var dueDays = isApproved && dueDate ? getDaysUntilDue(dueDate) : null;
        var dueAlertHtml = "";
        /* Live overdue calculation: show charges immediately even before the daily backend trigger persists them. */
        var liveOverdueInfo = isApproved ? getLoanOverdueInfo(loan) : { days: 0, fee: 0 };
        var savedCurrentOverdue = Math.max(0, Number(loan.overdueFeeCurrentPeriod || 0));
        var savedAccruedOverdue = Math.max(0, Number(loan.overdueFeeAccrued || 0));
        var liveOverdueAmount = Math.max(savedCurrentOverdue, Number(liveOverdueInfo.fee || 0));
        var historicalOverdue = Math.max(0, savedAccruedOverdue - savedCurrentOverdue);
        var displayOverdueAmount = historicalOverdue + liveOverdueAmount;
        var displayOverdueDays = Math.max(Number(liveOverdueInfo.days||0), dueDays !== null && dueDays < 0 ? Math.abs(dueDays) : 0);
        /* If an older saved overdue fee exists, derive a sensible day count instead of showing 0 Days. */
        if (displayOverdueAmount > 0 && displayOverdueDays <= 0) {
            var overdueRateForDisplay = (Number(loan.period)||30) < 30 ? 40 : 79;
            displayOverdueDays = Math.max(1, Math.ceil(displayOverdueAmount / overdueRateForDisplay));
        }
        var savedTotal = Math.max(0, Number(loan.total || 0));
        var displayTotalPayable = vdfExactLoanPayable(loan);
        if (isApproved && Math.abs(Number(loan.total || 0) - Number(displayTotalPayable || 0)) > 0.009) loan.total = Number(displayTotalPayable || 0);
        if (isApproved && dueDays !== null) {
            if (dueDays < 0) dueAlertHtml = '<div class="loan-due-alert overdue">⚠ Payment overdue by ' + Math.abs(dueDays) + ' day' + (Math.abs(dueDays) === 1 ? '' : 's') + '</div>';
            else if (dueDays <= 2) dueAlertHtml = '<div class="loan-due-alert urgent">⚠ Due very soon — ' + (dueDays === 0 ? 'Today' : dueDays + ' day' + (dueDays === 1 ? '' : 's') + ' remaining') + '</div>';
            else if (dueDays <= 5) dueAlertHtml = '<div class="loan-due-alert soon">⏳ ' + dueDays + ' days remaining for repayment</div>';
        }
        var progressClass = isRejected ? " rejected" : "";
        var step1 = isRejected ? "current" : (loanStatusKey === "pending" ? "current" : "done");
        var step2 = isApproved ? "current" : (isCleared ? "done" : "");
        var step3 = isApproved ? "" : (isCleared ? "done" : "");
        var step4 = isCleared ? "current" : "";
        var step1Label = isRejected ? "Rejected" : "Approved";

        return `
            <div class="loan-history-item premium-loan-card ${index === history.length - 1 ? "is-open" : ""}" data-loan-created="${escapeHTML(String(loan.createdAt || ""))}" data-loan-index="${index}" style="${index === history.length - 1 ? "" : ""}">
                <button type="button" class="premium-loan-toggle" onclick="togglePremiumLoanCard(this)" aria-expanded="${index === history.length - 1 ? "true" : "false"}">
                    <span class="premium-loan-left"><span class="premium-loan-number">L${index + 1}</span><span class="premium-loan-title-wrap"><span class="premium-loan-title-row"><span class="loan-title">Loan ${index + 1}</span><span class="loan-name-pencil" role="button" tabindex="0" title="Add / edit loan name" onclick="event.stopPropagation(); editLoanDisplayName(${index});" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();editLoanDisplayName(${index});}">✎</span></span><small class="premium-loan-custom-name" data-loan-name-index="${index}">${escapeHTML(getLoanDisplayName(application.id, index) || "Add name")}</small></span></span>
                    <span class="premium-loan-right">${getVdAutomaticLoanScore(loan).available ? `<span class="vdf-credit-score-wrap" title="Automatic loan score"><span class="vdf-credit-score-ring" style="--score:${getVdAutomaticLoanScore(loan).score};--score-color:${getVdAutomaticLoanScore(loan).score >= 80 ? "#22c55e" : getVdAutomaticLoanScore(loan).score >= 60 ? "#eab308" : getVdAutomaticLoanScore(loan).score >= 40 ? "#f97316" : "#ef4444"}"><span class="vdf-credit-score-number">${getVdAutomaticLoanScore(loan).score}</span><span class="vdf-credit-score-label">${getVdLoanRisk(getVdAutomaticLoanScore(loan).score).label}</span></span></span>` : ``}<span class="status ${getLoanStatusClass(loan.status)}">${escapeHTML(getLoanStatusDisplay(loan.status))}</span><span class="premium-chevron">⌄</span></span>
                </button>
                <div class="premium-loan-body">
                <div class="loan-progress${progressClass}" aria-label="Loan ${index + 1} repayment progress">
                    <div class="loan-progress-track">
                        <div class="loan-step ${step1}"><span class="loan-step-dot">${step1 === "done" ? "✓" : "1"}</span>${step1Label}</div>
                        <div class="loan-step ${step2}"><span class="loan-step-dot">${step2 === "done" ? "✓" : "2"}</span>Active</div>
                        <div class="loan-step ${step3}"><span class="loan-step-dot">${step3 === "done" ? "✓" : "3"}</span>Due</div>
                        <div class="loan-step ${step4}"><span class="loan-step-dot">${step4 === "done" ? "✓" : "4"}</span>Cleared</div>
                    </div>
                </div>
                ${(Number(loan.amountPaid || 0) > 0 || loan.balanceUpdated) ? (() => {
                    var lastUpdate = Array.isArray(loan.balanceUpdateHistory) && loan.balanceUpdateHistory.length ? loan.balanceUpdateHistory[loan.balanceUpdateHistory.length-1] : null;
                    var isPartPayment = !!(lastUpdate && String(lastUpdate.type||'').toLowerCase()==='part payment');
                    var isExtensionOnly = !!(lastUpdate && String(lastUpdate.type||'').toLowerCase()==='extension' && Number(loan.amountPaid||0)<=0);
                    if (isExtensionOnly) {
                        return `<p><strong>Amount:</strong> ₹${Number(loan.amount||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</p><p><strong>Interest:</strong> ₹${Number(loan.interest||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</p><p><strong>Platform Fee:</strong> ₹${Number(loan.fee||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</p><p><strong>Extension:</strong> <span style="color:#f4d47d;font-weight:900;">${Number(loan.extensionCount||1)} Month${Number(loan.extensionCount||1)===1?'':'s'}</span></p>${(isApproved && displayOverdueAmount>0)?`<p style="color:#ffb4b4;"><strong>Overdue Charges:</strong> ${Number(displayOverdueDays||0)} Day${Number(displayOverdueDays||0)===1?'':'s'} • ₹${Number(displayOverdueAmount).toLocaleString("en-IN",{maximumFractionDigits:2})}</p>`:''}${(vdfHasSavedLoanDiscount(loan))?`<p class="vdf-discount-line"><strong>Discount</strong><span class="vdf-discount-percent">${Number(loan.discountPercent||0).toLocaleString("en-IN",{maximumFractionDigits:2})}%</span><span class="vdf-discount-amount">-₹${Number(loan.discountAmount||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</span></p>`:``}<p><strong>Total Payable:</strong> ${vdfDiscountedTotalMarkup(loan, isApproved?displayTotalPayable:loan.total||0)}</p>`;
                    }
                    return `<div class="vdf-payment-progress-box"><p><strong>Total Amount:</strong> <span>₹${Number(loan.originalFullAmount != null ? loan.originalFullAmount : loan.total||0).toLocaleString("en-IN", {maximumFractionDigits:2})}</span></p><p><strong>Amount Paid:</strong> <span class="vdf-paid-value">₹${Number(loan.amountPaid || 0).toLocaleString("en-IN", {maximumFractionDigits:2})}</span></p><p><strong>Balance Amount:</strong> <span class="vdf-remaining-value">₹${Number(loan.remainingAmount != null ? loan.remainingAmount : 0).toLocaleString("en-IN", {maximumFractionDigits:2})}</span></p><p><strong>New Interest:</strong> ₹${Number(loan.adjustedInterest || 0).toLocaleString("en-IN", {maximumFractionDigits:2})}</p><p><strong>Platform Fee:</strong> <strong style="color:#86efac;">₹0</strong></p>${(isApproved && displayOverdueAmount>0)?`<p style="color:#ffb4b4;"><strong>Overdue Charges:</strong> ${Number(displayOverdueDays||0)} Day${Number(displayOverdueDays||0)===1?'':'s'} • ₹${Number(displayOverdueAmount).toLocaleString("en-IN",{maximumFractionDigits:2})}</p>`:''}${(vdfHasSavedLoanDiscount(loan))?`<p class="vdf-discount-line"><strong>Discount</strong><span class="vdf-discount-percent">${Number(loan.discountPercent||0).toLocaleString("en-IN",{maximumFractionDigits:2})}%</span><span class="vdf-discount-amount">-₹${Number(loan.discountAmount||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</span></p>`:``}<p><strong>Total Payable:</strong> ${vdfDiscountedTotalMarkup(loan, displayTotalPayable || 0)}</p></div>`;
                })() : `<p><strong>Amount:</strong> <span class="status-animated-number" data-number="${Number(loan.amount)||0}" data-prefix="₹" data-format="money">₹0</span></p><p><strong>Interest:</strong> <span class="status-animated-number" data-number="${Number(loan.interest)||0}" data-prefix="₹" data-format="money">₹0</span></p><p><strong>Platform Fee:</strong> <span class="status-animated-number" data-number="${Number(loan.fee)||0}" data-prefix="₹" data-format="money">₹0</span></p>${(isApproved && displayOverdueAmount > 0) ? `<p style="color:#ffb4b4;"><strong>Overdue Charges:</strong> ${Number(displayOverdueDays||0)} Day${Number(displayOverdueDays||0)===1?'':'s'} • ₹${Number(displayOverdueAmount).toLocaleString("en-IN", {maximumFractionDigits:2})}</p>` : ""}${(vdfHasSavedLoanDiscount(loan))?`<p class="vdf-discount-line"><strong>Discount</strong><span class="vdf-discount-percent">${Number(loan.discountPercent||0).toLocaleString("en-IN",{maximumFractionDigits:2})}%</span><span class="vdf-discount-amount">-₹${Number(loan.discountAmount||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</span></p>`:``}<p><strong>Total Payable:</strong> ${vdfDiscountedTotalMarkup(loan, isApproved ? displayTotalPayable : loan.total)}</p>`}
                ${isApproved ? `
                <p><strong>Due Date:</strong>
                    <span class="loan-due-date">${escapeHTML(dueDate)}</span>
                </p>
                <p><strong>Due Date In:</strong>
                    <span class="loan-due-in">${escapeHTML(getLoanDueText(dueDate))}</span>
                </p>
                ${dueAlertHtml}` : ""}
                <div class="premium-loan-mini-actions">
                    <button type="button" onclick="event.stopPropagation(); openCustomerStatementForLoan(${index});">🧾 View Statement</button>
                    ${isApproved ? `<button type="button" class="vdf-pay-now-btn" onclick="event.stopPropagation(); openLoanPayment(${index});">₹ Pay Now</button>` : ""}
                    ${isApproved ? `<button type="button" onclick="event.stopPropagation(); openVdfLoanRequest(${index});">📩 Request</button>` : ""}
                </div>
                </div>
            </div>
        `;
    }).join("");

    var firstLetter = String(application.name || "C").trim().charAt(0).toUpperCase() || "C";
    var activeCount = activeLoans.length;
    var nextLoan = activeLoans.length ? activeLoans[activeLoans.length - 1] : null;
    /* Due information is shown only for loans that are actually Approved.
       Rejected, Pending and Amount Cleared loans must never show due date/due countdown. */
    var dueCandidates = activeLoans.map(function(loan) {
        var date = formatVdfDate(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period));
        return {
            loan: loan,
            date: date,
            days: getDaysUntilDue(date),
            amount: Number(loan.amount) || 0,
            totalPayable: vdfExactLoanPayable(loan)
        };
    }).filter(function(item) {
        return item.date && item.date !== "Not set" && item.days !== null && item.days >= 0;
    }).sort(function(a, b) { return a.days - b.days; });
    /* Show only the single nearest upcoming Approved loan and that loan's TOTAL PAYABLE amount. */
    var nextDueLoan = dueCandidates.length ? dueCandidates[0] : null;
    var nextDueDate = nextDueLoan ? nextDueLoan.date : "";
    var nextDueAmount = nextDueLoan ? nextDueLoan.totalPayable : 0;
    var nextDueText = nextDueDate ? getLoanDueText(nextDueDate) : "No upcoming due";
    var latestStatus = history.length ? (history[history.length - 1].status || "Pending") : "Pending";
    var overallStatus = latestStatus;

    /* Digital Loan Member Card: identity stays with the customer; VALID THRU follows the nearest active loan due month/year. */
    var memberDueLoan = activeLoans.map(function(loan) {
        var d = formatVdfDate(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period));
        return { loan: loan, date: d, days: getDaysUntilDue(d) };
    }).filter(function(x){ return x.date && x.date !== "Not set"; })
      .sort(function(a,b){
          var ad = a.days === null ? 999999 : Math.abs(a.days);
          var bd = b.days === null ? 999999 : Math.abs(b.days);
          return ad-bd;
      })[0] || null;
    var memberValidThru = "--/--";
    if (memberDueLoan && memberDueLoan.date) {
        var md = String(memberDueLoan.date).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        if (md) memberValidThru = String(md[2]).padStart(2,"0") + "/" + String(md[3]).slice(-2);
    }
    var memberCardStatus = activeLoans.length ? "ACTIVE" : (history.some(function(l){var k=String(l.status||"").toLowerCase();return k==="cleared"||k==="amount cleared"||k==="amount-cleared";}) ? "CLEARED" : String(overallStatus||"PENDING").toUpperCase());
    var cleanVdDigits = String(application.id || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    var memberCardNumber = "VD " + (cleanVdDigits.slice(-6) || "000000") + "  ••••  ••••";
    var memberContactPhone = String(application.mobile || application.phone || application.phoneNumber || "").trim();

    var memberCardSlot = document.getElementById("vdfStatusMemberCardSlot");
    if (memberCardSlot) {
        memberCardSlot.innerHTML = `
            <div class="vdf-member-card-wrap" aria-label="VD Finance Loan Member Card">
                <div class="vdf-member-card">
                    <div class="vdf-card-top">
                        <div class="vdf-card-brand">VD FINANCE<small>LOAN MEMBER CARD</small></div>
                        <div class="vdf-card-status">${escapeHTML(memberCardStatus)}</div>
                    </div>
                    <div class="vdf-card-chip" aria-hidden="true"></div>
                    <div class="vdf-card-number">${escapeHTML(memberCardNumber)}</div>
                    <div class="vdf-card-bottom">
                        <div>
                            <div class="vdf-card-label">Member Name</div>
                            <div class="vdf-card-name">${escapeHTML(application.name || "Customer")}</div>
                            <div class="vdf-card-id">VD ID: ${escapeHTML(application.id || "")}</div>
                            ${memberContactPhone ? `<div class="vdf-card-contact"><span class="vdf-phone-icon">☎</span><span>Contact: ${escapeHTML(memberContactPhone)}</span></div>` : ""}
                        </div>
                        <div class="vdf-card-valid">
                            <div class="vdf-card-label">Valid Thru</div>
                            <strong>${escapeHTML(memberValidThru)}</strong>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    result.innerHTML = `
        <div class="status-card">
            <div class="customer-profile">
                <div class="customer-identity">
                    <div class="customer-avatar">${escapeHTML(firstLetter)}</div>
                    <div>
                        <div class="customer-name">${escapeHTML(application.name || "Customer")}</div>
                        <div class="customer-id">${escapeHTML(application.id)}</div>
                    </div>
                </div>
                <div class="customer-actions">
                    <button type="button" class="statement-btn" onclick="openCustomerStatement()">🧾 Statement</button>
                    <button type="button" class="statement-btn" onclick="openVdMessenger('customer')">💬 WhatsApp <span id="vdCustomerMsgBadge" class="vd-msg-main-badge" style="display:none">0</span></button>
                    <button type="button" class="history-btn" onclick="openCustomerHistoryFromTop()">View History ↓</button>
                    <button type="button" id="statusRefreshButton" class="vdf-status-refresh-btn" onclick="refreshCustomerStatusNow()">🔄 Refresh Status</button>
                    <button type="button" class="logout-btn" onclick="logoutCustomerStatus()">↪ Logout</button>
                </div>
            </div>

            ${nextDueDate ? `
                <div class="vdf-due-ticker" role="status" aria-label="Nearest upcoming loan due date">
                    <span class="vdf-due-ticker-label">📅 Upcoming Due</span>
                    <div class="vdf-due-ticker-window"><span class="vdf-due-ticker-text">📅 Next Due Date: ${escapeHTML(nextDueDate)} &nbsp; • &nbsp; 💰 Total Payable: ${escapeHTML("₹" + (Number(nextDueAmount)||0).toLocaleString("en-IN", {maximumFractionDigits:2}))}</span></div>
                </div>
            ` : ""}

            <div class="dashboard-grid">
                <div class="metric-card metric-red">
                    <div class="metric-label">💰 Total Payable</div>
                    <div id="vdfStatusTotalPayable" class="metric-value status-animated-number" data-number="${Number(outstanding)||0}" data-prefix="₹" data-format="money">₹${Number(outstanding||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</div>
                    <div class="metric-sub">All active loan accounts</div>
                </div>
                <div class="metric-card metric-green">
                    <div class="metric-label">💵 Amount Cleared</div>
                    <div class="metric-value status-animated-number" data-number="${Number(amountClearedTotal)||0}" data-prefix="₹" data-format="money">₹0</div>
                    <div class="metric-sub">Total cleared loan amount</div>
                </div>
                <div class="metric-card metric-gold">
                    <div class="metric-label">💳 Active Accounts</div>
                    <div class="metric-value status-animated-number" data-number="${Number(activeCount)||0}" data-format="integer">0</div>
                    <div class="metric-sub">Open loan accounts</div>
                </div>
                <div class="metric-card metric-green">
                    <div class="metric-label">🛡️ Loan Status</div>
                    <div class="metric-value">${overallStatus}</div>
                    <div class="metric-sub">Latest loan application status</div>
                </div>
                <div class="metric-card metric-blue">
                    <div class="metric-label">📅 Next Due</div>
                    <div class="metric-value">${escapeHTML(nextDueText)}</div>
                    <div class="metric-sub">${nextDueDate ? "Repayment date: " + escapeHTML(nextDueDate) : "Repayment date not available"}</div>
                </div>
            </div>

            ${nextDueDate ? `
                <div class="reminder-box">
                    <h4>🔔 Reminder</h4>
                    <p>Your repayment due date is <strong>${escapeHTML(nextDueDate)}</strong>.</p>
                </div>
            ` : ""}

            <div class="status-tabs" role="tablist" aria-label="Customer status sections">
                <button type="button" class="active" data-status-tab="overview" onclick="switchCustomerStatusTab('overview')">Overview</button>
                <button type="button" data-status-tab="accounts" onclick="switchCustomerStatusTab('accounts')">Accounts</button>
                <button type="button" data-status-tab="history" onclick="switchCustomerStatusTab('history')">History</button>
            </div>

            <div class="customer-tab-panel" data-status-panel="overview">
                <div class="loan-section">
                    <div class="loan-section-title">📋 Loan Overview</div>
                    <div class="transaction-placeholder">Your active loan summary is shown above. Select <strong>Accounts</strong> to view each loan in detail or <strong>History</strong> to view loan activity.</div>
                </div>
            </div>

            <div class="customer-tab-panel" data-status-panel="accounts" style="display:none">
                <div class="loan-section" id="customerLoanHistory">
                    <div class="loan-section-title">📋 Loan Accounts</div>
                    <div class="vdf-account-date-filter" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 16px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.035)">
                        <label for="vdfAccountDateMode" style="font-weight:800;color:#dce6f8">Show accounts:</label>
                        <select id="vdfAccountDateMode" onchange="changeCustomerAccountDateMode(this.value)" style="min-height:42px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#111827;color:#fff;font-weight:700">
                            <option value="all">All Accounts</option>
                            <option value="day">Day-wise</option>
                            <option value="month">Month-wise</option>
                        </select>
                        <input id="vdfAccountDateValue" type="date" onchange="filterCustomerAccountsByDate()" aria-label="Choose day" style="display:none;min-height:42px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#111827;color:#fff" />
                        <input id="vdfAccountMonthValue" type="month" onchange="filterCustomerAccountsByDate()" aria-label="Choose month" style="display:none;min-height:42px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#111827;color:#fff" />
                        <span id="vdfAccountFilterCount" style="color:#aab6ca;font-size:13px;font-weight:700">Showing all accounts</span>
                    </div>
                    <div id="vdfCustomerLoanHistoryList">${historyHtml}</div>
                </div>
            </div>

            <div class="customer-tab-panel" data-status-panel="history" style="display:none">
                <div class="transaction-section">
                    <div class="loan-section-title">🧾 Loan Tracking History</div>
                    <div id="vdfCustomerTrackingHistory">${renderVdfCustomerTrackingHistory(application)}</div>
                </div>
            </div>
        </div>
    `;


    animateStatusNumbers(result);
    /* Customer popup / Admin Note.
       This is deliberately triggered AFTER the Status page has been rendered,
       so the popup cannot get hidden behind the newly-rendered Status content. */
    var customerPopupMessage = String(
        application.adminNote || application.statusPopup || ""
    ).trim();

    if (customerPopupMessage) {
        showCustomerAdminPopup(customerPopupMessage);
    }
}


/* ================= CUSTOMER STATEMENT / LOGOUT ================= */
function getStatementOpenDate(loan, application) {
    var raw = (loan && (loan.createdAt || loan.applicationDate || loan.loanDate || loan.appliedAt)) ||
              (application && (application.createdAt || application.applicationDate || application.loanDate || application.appliedAt)) ||
              "";

    /*
       The backend may not carry createdAt on every historical loan row.
       Since every VDF loan has a fixed 30-day tenure, the repayment date
       is a reliable fallback for the original loan/application date.
    */
    if (!raw && loan && loan.repaymentDate) {
        var dueText = String(loan.repaymentDate).trim();
        var m = dueText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        var due = m
            ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
            : new Date(dueText);
        if (!isNaN(due.getTime())) {
            due.setDate(due.getDate() - 30);
            raw = due;
        }
    }

    if (!raw) return "—";

    var text = formatVdfDate(raw);
    var parts = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!parts) return text;

    var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return parts[1] + " " + monthNames[Number(parts[2]) - 1] + " " + parts[3];
}

/* ================= PER-LOAN DISPLAY NAME =================
   Optional customer-side label, e.g. "Ravi", "Friend - Suresh".
   Kept separate from the real Loan 1 / Loan 2 number so account history stays unchanged. */
function getLoanDisplayName(applicationId, loanIndex) {
    try {
        var all = JSON.parse(localStorage.getItem("vdFinanceLoanDisplayNames") || "{}");
        var app = all[String(applicationId || "")] || {};
        return String(app[String(loanIndex)] || "").trim();
    } catch (e) { return ""; }
}

function setLoanDisplayName(applicationId, loanIndex, value) {
    try {
        var all = JSON.parse(localStorage.getItem("vdFinanceLoanDisplayNames") || "{}");
        var key = String(applicationId || "");
        if (!all[key]) all[key] = {};
        value = String(value || "").trim().slice(0, 40);
        if (value) all[key][String(loanIndex)] = value;
        else delete all[key][String(loanIndex)];
        localStorage.setItem("vdFinanceLoanDisplayNames", JSON.stringify(all));
        return value;
    } catch (e) { return ""; }
}

function editLoanDisplayName(loanIndex) {
    var application = window.vdfCurrentStatementApplication;
    if (!application) return;
    var current = getLoanDisplayName(application.id, loanIndex);
    var value = prompt("Loan " + (loanIndex + 1) + " name (example: Ravi / Friend - Suresh)", current);
    if (value === null) return;
    value = setLoanDisplayName(application.id, loanIndex, value);
    document.querySelectorAll('[data-loan-name-index="' + loanIndex + '"]').forEach(function(el){
        el.textContent = value || "Add name";
        el.classList.toggle("is-empty", !value);
    });
}

function getStatementSelectedLoans(application) {
    var history = ensureLoanHistory(application);
    var selected = String(window.vdfStatementSelection || "all");
    if (selected === "all") return history.map(function(loan, index){ return {loan:loan, originalIndex:index}; });
    var idx = Number(selected);
    if (!Number.isInteger(idx) || idx < 0 || idx >= history.length) return history.map(function(loan, index){ return {loan:loan, originalIndex:index}; });
    return [{loan:history[idx], originalIndex:idx}];
}

function vdfIsAdjustedStatementLoan(loan) {
    return !!(loan && (Number(loan.amountPaid || 0) > 0 || loan.balanceUpdated || Number(loan.extensionCount || 0) > 0));
}

function vdfStatementAdjustedValues(loan) {
    loan = loan || {};
    var originalPrincipal = Number(loan.originalPrincipal != null ? loan.originalPrincipal : loan.amount) || 0;
    var originalInterest = Number(loan.originalInterest != null ? loan.originalInterest : loan.interest) || 0;
    var originalFee = Number(loan.originalPlatformFee != null ? loan.originalPlatformFee : (loan.fee != null ? loan.fee : 100)) || 0;
    var totalAmount = Number(loan.originalFullAmount);
    if (!isFinite(totalAmount) || totalAmount <= 0) totalAmount = originalPrincipal + originalInterest + originalFee;
    var amountPaid = Math.max(0, Number(loan.amountPaid || 0));
    var balanceAmount = Math.max(0, Number(loan.remainingAmount != null ? loan.remainingAmount : (totalAmount - amountPaid)) || 0);
    var newInterest = Math.max(0, Number(loan.adjustedInterest != null ? loan.adjustedInterest : loan.interest) || 0);
    var liveInfo = getLoanOverdueInfo(loan);
    var savedCurrentOverdue = Math.max(0, Number(loan.overdueFeeCurrentPeriod || 0));
    var savedAccruedOverdue = Math.max(0, Number(loan.overdueFeeAccrued || 0));
    var liveCurrentOverdue = Math.max(savedCurrentOverdue, Number(liveInfo.fee || 0));
    var overdueAmount = Math.max(0, savedAccruedOverdue - savedCurrentOverdue) + liveCurrentOverdue;
    var savedNowPayable = Math.max(0, Number(loan.total != null ? loan.total : (balanceAmount + newInterest + savedAccruedOverdue)) || 0);
    var nowPayable = savedNowPayable + Math.max(0, liveCurrentOverdue - savedCurrentOverdue);
    return {totalAmount:totalAmount, amountPaid:amountPaid, balanceAmount:balanceAmount, newInterest:newInterest, originalFee:originalFee || 100, overdueAmount:overdueAmount, nowPayable:nowPayable};
}

function vdfHasSavedLoanDiscount(loan) {
    loan = loan || {};
    /* Discount belongs only to the exact loan object on which Admin saved it.
       Never infer a discount from total/interest/other loans. Also preserves older
       saved discounts that pre-date the discountApplied flag. */
    return loan.discountApplied === true ||
        Math.max(0, Number(loan.discountAmount || 0)) > 0 ||
        Math.max(0, Number(loan.discountPercent || 0)) > 0;
}
function vdfDiscountedTotalMarkup(loan, finalPayable) {
    var finalValue = Math.max(0, Number(finalPayable || 0));
    if (!vdfHasSavedLoanDiscount(loan)) {
        return '<span class="vdf-final-payable">₹' + finalValue.toLocaleString("en-IN", {maximumFractionDigits:2}) + '</span>';
    }
    var beforeDiscount = (typeof getVdDiscountBaseTotal === "function")
        ? Math.max(0, Number(getVdDiscountBaseTotal(loan) || 0))
        : Math.max(0, finalValue + Math.max(0, Number(loan.discountAmount || 0)));
    var pct = Math.max(0, Math.min(100, Number(loan.discountPercent || 0)));
    var expectedDiscount = Number((beforeDiscount * pct / 100).toFixed(2));
    var expectedFinal = Number(Math.max(0, beforeDiscount - expectedDiscount).toFixed(2));
    return '<span class="vdf-discount-total-stack"><span class="vdf-old-total">₹' + beforeDiscount.toLocaleString("en-IN", {maximumFractionDigits:2}) + '</span><span class="vdf-new-total">₹' + expectedFinal.toLocaleString("en-IN", {maximumFractionDigits:2}) + '</span></span>';
}

function vdfExactLoanPayable(loan) {
    loan = loan || {};
    var statusKey = String(loan.status || "").trim().toLowerCase();
    if (statusKey === "amount cleared" || statusKey === "amount-cleared" || statusKey === "cleared" || statusKey === "paid") return 0;
    var base = (typeof getVdDiscountBaseTotal === "function") ? Math.max(0, Number(getVdDiscountBaseTotal(loan) || 0)) : Math.max(0, Number(loan.total || 0));
    if (!vdfHasSavedLoanDiscount(loan)) return Number(base.toFixed(2));
    var pct = Math.max(0, Math.min(100, Number(loan.discountPercent || 0)));
    var discount = Number((base * pct / 100).toFixed(2));
    return Number(Math.max(0, base - discount).toFixed(2));
}

function vdfStatementLoanRows(loan, application) {
    loan = loan || {};
    var rows = [];
    var openDate = getStatementOpenDate(loan, application);
    var dueDate = formatVdfDate(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period));
    var status = String(getLoanStatusDisplay(loan.status) || "-");
    var statusKey = String(loan.status || "").trim().toLowerCase();
    var isCleared = statusKey === "amount cleared" || statusKey === "amount-cleared" || statusKey === "cleared" || statusKey === "paid";
    var updates = Array.isArray(loan.balanceUpdateHistory) ? loan.balanceUpdateHistory : [];
    var lastUpdate = updates.length ? updates[updates.length - 1] : null;
    var updateType = String(lastUpdate && lastUpdate.type || "").toLowerCase();
    var isPartPayment = Number(loan.amountPaid || 0) > 0 || updateType === "part" || updateType === "part payment";
    var extensionHistory = Array.isArray(loan.extensionHistory) ? loan.extensionHistory : [];
    var isExtension = Number(loan.extensionCount || 0) > 0 || extensionHistory.length > 0 || updateType === "extension";
    var live = getLoanOverdueInfo(loan);
    var savedCurrent = Math.max(0, Number(loan.overdueFeeCurrentPeriod || 0));
    var savedAccrued = Math.max(0, Number(loan.overdueFeeAccrued || 0));
    var liveCurrent = Math.max(savedCurrent, Number(live.fee || 0));
    var overdueAmount = loan.manualOverdueEdited === true ? Math.max(0, Number(loan.manualOverdueCharges || 0)) : Math.max(0, savedAccrued - savedCurrent) + liveCurrent;
    var overdueDays = loan.manualOverdueEdited === true ? Math.max(0, Number(loan.manualOverdueDays || 0)) : Math.max(0, Number(live.days || 0));
    var discountPercent = Math.max(0, Number(loan.discountPercent || 0));
    var discountAmount = Math.max(0, Number(loan.discountAmount || 0));
    var payable = isCleared ? 0 : vdfExactLoanPayable(loan);

    rows.push(["Open Date", openDate]);

    if (isPartPayment) {
        var v = vdfStatementAdjustedValues(loan);
        rows.push(["Update", "Part Payment"]);
        rows.push(["Old / Total Amount", money(v.totalAmount)]);
        rows.push(["Amount Paid", money(v.amountPaid)]);
        rows.push(["Current Balance", money(v.balanceAmount)]);
        rows.push(["New Interest", money(v.newInterest)]);
        rows.push(["Platform Fee", "Rs. 0"]);
    } else {
        rows.push([isExtension ? "Original Loan Amount" : "Amount", money(loan.amount)]);
        rows.push(["Interest", money(loan.interest)]);
        rows.push(["Platform Fee", money(loan.fee)]);
    }

    if (isExtension) {
        var extCount = Math.max(Number(loan.extensionCount || 0), extensionHistory.length, 1);
        rows.push(["Extension Period", extCount + " Month" + (extCount === 1 ? "" : "s")]);
        if (extensionHistory.length) {
            var firstExt = extensionHistory[0] || {};
            var lastExt = extensionHistory[extensionHistory.length - 1] || {};
            if (firstExt.oldDueDate) rows.push(["Original Due Date", formatVdfDate(firstExt.oldDueDate)]);
            if (lastExt.newDueDate) rows.push(["Extended Due Date", formatVdfDate(lastExt.newDueDate)]);
        }
    }

    /* Overdue is conditional. A cleared loan never shows a fresh overdue row. */
    if (!isCleared && (overdueAmount > 0 || overdueDays > 0)) {
        rows.push(["Overdue", overdueDays + " Day" + (overdueDays === 1 ? "" : "s") + " - " + money(overdueAmount)]);
    }
    if (vdfHasSavedLoanDiscount(loan)) rows.push(["Discount", discountPercent.toLocaleString("en-IN", {maximumFractionDigits:2}) + "%   -" + money(discountAmount)]);

    if (isCleared) {
        var clearedPaid = Math.max(0, Number(loan.clearedAmount != null ? loan.clearedAmount : (loan.total || 0)));
        rows.push(["Amount Paid", money(clearedPaid)]);
        rows.push(["Balance", money(0)]);
        rows.push(["Pending", money(0)]);
        if (loan.clearedAt) rows.push(["Cleared Date", formatVdfDate(loan.clearedAt)]);
        rows.push(["Status", "CLEARED / PAID"]);
        return {rows:rows, payable:0};
    }

    rows.push(["Total Payable", money(payable)]);
    rows.push(["Due Date", dueDate]);
    rows.push(["Status", status]);
    return {rows:rows, payable:payable};
}

var vdfStatementLang = "en";
var vdfStatementI18n = {
 en:{title:"Loan Account Statement",customerId:"Customer ID",customer:"Customer",statement:"Statement",generated:"Generated",currentPayable:"Current Payable",allLoans:"All Loans",loan:"Loan",footer:"VD Finance customer statement • For records and reference.",
 "Open Date":"Open Date","Update":"Update","Part Payment":"Part Payment","Old / Total Amount":"Old / Total Amount","Amount Paid":"Amount Paid","Current Balance":"Current Balance","New Interest":"New Interest","Platform Fee":"Platform Fee","Original Loan Amount":"Original Loan Amount","Amount":"Amount","Interest":"Interest","Extension Period":"Extension Period","Original Due Date":"Original Due Date","Extended Due Date":"Extended Due Date","Overdue":"Overdue","Discount":"Discount","Balance":"Balance","Pending":"Pending","Cleared Date":"Cleared Date","Status":"Status","Total Payable":"Total Payable","Due Date":"Due Date","CLEARED / PAID":"CLEARED / PAID"},
 te:{title:"రుణ ఖాతా స్టేట్‌మెంట్",customerId:"కస్టమర్ ID",customer:"కస్టమర్",statement:"స్టేట్‌మెంట్",generated:"తయారు చేసిన తేదీ",currentPayable:"ప్రస్తుత చెల్లించవలసిన మొత్తం",allLoans:"అన్ని రుణాలు",loan:"రుణం",footer:"VD Finance కస్టమర్ స్టేట్‌మెంట్ • రికార్డు మరియు సూచన కోసం.",
 "Open Date":"రుణ ప్రారంభ తేదీ","Update":"అప్‌డేట్","Part Payment":"పాక్షిక చెల్లింపు","Old / Total Amount":"పాత / మొత్తం మొత్తం","Amount Paid":"చెల్లించిన మొత్తం","Current Balance":"ప్రస్తుత మిగులు","New Interest":"కొత్త వడ్డీ","Platform Fee":"ప్లాట్‌ఫామ్ ఫీజు","Original Loan Amount":"అసలు రుణ మొత్తం","Amount":"రుణ మొత్తం","Interest":"వడ్డీ","Extension Period":"పొడిగింపు కాలం","Original Due Date":"అసలు గడువు తేదీ","Extended Due Date":"పొడిగించిన గడువు తేదీ","Overdue":"గడువు మించినది","Discount":"డిస్కౌంట్","Balance":"మిగులు","Pending":"బాకీ","Cleared Date":"పూర్తిగా చెల్లించిన తేదీ","Status":"స్థితి","Total Payable":"మొత్తం చెల్లించవలసినది","Due Date":"గడువు తేదీ","CLEARED / PAID":"పూర్తిగా చెల్లించబడింది"},
 hi:{title:"ऋण खाता विवरण",customerId:"ग्राहक ID",customer:"ग्राहक",statement:"विवरण",generated:"तैयार करने की तारीख",currentPayable:"वर्तमान देय राशि",allLoans:"सभी ऋण",loan:"ऋण",footer:"VD Finance ग्राहक विवरण • रिकॉर्ड और संदर्भ के लिए।",
 "Open Date":"ऋण प्रारंभ तिथि","Update":"अपडेट","Part Payment":"आंशिक भुगतान","Old / Total Amount":"पुरानी / कुल राशि","Amount Paid":"भुगतान की गई राशि","Current Balance":"वर्तमान शेष राशि","New Interest":"नया ब्याज","Platform Fee":"प्लेटफ़ॉर्म शुल्क","Original Loan Amount":"मूल ऋण राशि","Amount":"ऋण राशि","Interest":"ब्याज","Extension Period":"विस्तार अवधि","Original Due Date":"मूल देय तिथि","Extended Due Date":"बढ़ाई गई देय तिथि","Overdue":"अतिदेय","Discount":"छूट","Balance":"शेष राशि","Pending":"बकाया","Cleared Date":"पूर्ण भुगतान तिथि","Status":"स्थिति","Total Payable":"कुल देय राशि","Due Date":"देय तिथि","CLEARED / PAID":"पूर्ण भुगतान"}
};
function vdfST(key){var d=vdfStatementI18n[vdfStatementLang]||vdfStatementI18n.en;return d[key]||key;}
function changeStatementLanguage(){var el=document.getElementById("vdfStatementLanguage");vdfStatementLang=el?el.value:"en";renderCustomerStatement();}
function vdfTranslateStatementValue(label,value){
 if(label==="Update" && value==="Part Payment") return vdfST("Part Payment");
 if(label==="Status" && String(value).toUpperCase()==="CLEARED / PAID") return vdfST("CLEARED / PAID");
 if(label==="Overdue"){
   var m=String(value).match(/^(\d+)\s+Days?\s+-\s+(.+)$/i); if(m){
    if(vdfStatementLang==="te") return m[1]+" రోజులు - "+m[2];
    if(vdfStatementLang==="hi") return m[1]+" दिन - "+m[2];
   }
 }
 if(label==="Extension Period"){
   var m2=String(value).match(/^(\d+)\s+Months?$/i); if(m2){
    if(vdfStatementLang==="te") return m2[1]+" నెలలు";
    if(vdfStatementLang==="hi") return m2[1]+" महीने";
   }
 }
 return value;
}

function renderCustomerStatement() {
    var application = window.vdfCurrentStatementApplication;
    if (!application) return;
    var langEl=document.getElementById("vdfStatementLanguage"); if(langEl){langEl.value=vdfStatementLang;}
    var selectedLoans = getStatementSelectedLoans(application);
    var payableTotal = selectedLoans.reduce(function(sum, item) {
        var st = String(item.loan.status || "").trim().toLowerCase();
        if (st === "rejected" || st === "amount cleared" || st === "amount-cleared" || st === "cleared" || st === "paid") return sum;
        return sum + vdfStatementLoanRows(item.loan, application).payable;
    }, 0);
    var paper = document.getElementById("vdfStatementPaper"); if(!paper)return;
    var generated = new Date().toLocaleString(vdfStatementLang==="te"?"te-IN":(vdfStatementLang==="hi"?"hi-IN":"en-IN"));
    var selectedIndex = Number(window.vdfStatementSelection);
    var selectedCustomName = window.vdfStatementSelection === "all" ? "" : getLoanDisplayName(application.id, selectedIndex);
    var label = window.vdfStatementSelection === "all" ? vdfST("allLoans") : vdfST("loan") + " " + (selectedIndex + 1) + (selectedCustomName ? " — " + selectedCustomName : "");
    var cards = selectedLoans.map(function(item) {
        var info = vdfStatementLoanRows(item.loan, application), index = item.originalIndex;
        var heading = '<div style="font-weight:900;font-size:16px;margin-bottom:10px;">' + escapeHTML(vdfST("loan")) + ' ' + (index + 1) + '</div>';
        return '<div class="vdf-statement-loan-detail">' + heading + info.rows.map(function(r){return '<div><strong>'+escapeHTML(vdfST(r[0]))+':</strong> '+escapeHTML(vdfTranslateStatementValue(r[0],r[1]))+'</div>';}).join('') + '</div>';
    }).join("");
    paper.innerHTML = '<div class="vdf-statement-brand">VD FINANCE</div><div class="vdf-statement-subtitle">'+escapeHTML(vdfST("title"))+' • ' + escapeHTML(label) + '</div><div class="vdf-statement-meta"><div><strong>'+escapeHTML(vdfST("customerId"))+':</strong> ' + escapeHTML(application.id || "—") + '</div><div><strong>'+escapeHTML(vdfST("customer"))+':</strong> ' + escapeHTML(application.name || "Customer") + '</div><div><strong>'+escapeHTML(vdfST("statement"))+':</strong> ' + escapeHTML(label) + '</div><div><strong>'+escapeHTML(vdfST("generated"))+':</strong> ' + escapeHTML(generated) + '</div></div><div class="vdf-statement-total"><div class="vdf-statement-total-label">'+escapeHTML(vdfST("currentPayable"))+'</div><div class="vdf-statement-total-value">' + escapeHTML(money(payableTotal)) + '</div></div><div class="vdf-statement-detail-list">' + cards + '</div><div class="vdf-statement-footer">'+escapeHTML(vdfST("footer"))+'</div>';
}

function togglePremiumLoanCard(button) {
    var card = button && button.closest ? button.closest(".premium-loan-card") : null;
    if (!card) return;
    var willOpen = !card.classList.contains("is-open");
    var section = card.parentElement;
    if (section) {
        section.querySelectorAll(".premium-loan-card.is-open").forEach(function(other) {
            if (other !== card) {
                other.classList.remove("is-open");
                var otherBtn = other.querySelector(".premium-loan-toggle");
                if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
            }
        });
    }
    card.classList.toggle("is-open", willOpen);
    button.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function changeStatementSelection() {
    var select = document.getElementById("vdfStatementLoanSelect");
    window.vdfStatementSelection = select ? select.value : "all";
    renderCustomerStatement();
}

async function openLoanPayment(loanIndex) {
    var application = window.vdfCurrentStatementApplication;
    if (!application) { alert("Please check your application status first."); return; }
    var history = ensureLoanHistory(application);
    loanIndex = Number(loanIndex);
    if (!Number.isInteger(loanIndex) || loanIndex < 0 || !history[loanIndex]) {
        alert("This loan payment is not available.");
        return;
    }
    var loan = history[loanIndex];
    var status = String(loan.status || "").trim().toLowerCase();
    if (status === "cleared" || status === "amount cleared" || status === "paid") {
        alert("This loan is already cleared."); return;
    }
    if (status !== "approved" && status !== "active") {
        alert("Payment is available only for an active approved loan."); return;
    }
    if (typeof Razorpay === "undefined") {
        alert("Payment service could not load. Please check your internet and try again."); return;
    }

    var payable = Math.max(0, Number(typeof vdfExactLoanPayable === "function" ? vdfExactLoanPayable(loan) : loan.total || 0));
    if (!payable) { alert("No payable amount is available for this loan."); return; }

    var entered = prompt("Loan " + (loanIndex + 1) + " current payable: " + money(payable) + "\n\nEnter amount to pay:", payable.toFixed(2));
    if (entered === null) return;
    var payAmount = Number(String(entered).replace(/,/g, "").trim());
    if (!Number.isFinite(payAmount) || payAmount <= 0) { alert("Enter a valid payment amount."); return; }
    if (payAmount > payable + 0.01) { alert("Payment cannot be more than the current payable " + money(payable) + "."); return; }

    try {
        var createRes = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
            method: "POST",
            headers: {"Content-Type":"text/plain;charset=utf-8"},
            body: JSON.stringify({action:"createPaymentOrder", applicationId:application.id, loanIndex:loanIndex, amount:payAmount})
        });
        var orderData = await createRes.json();
        if (!orderData || !orderData.success) throw new Error(orderData && orderData.error ? orderData.error : "Could not create payment order.");

        var options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: "INR",
            name: "VD Finance",
            description: "Loan " + (loanIndex + 1) + " Payment",
            order_id: orderData.orderId,
            prefill: {name: application.name || "", email: application.email || "", contact: application.mobile || ""},
            notes: {application_id: application.id || "", loan_number: String(loanIndex + 1)},
            theme: {color: "#b58a18"},
            handler: async function(response) {
                try {
                    var verifyRes = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                        method: "POST",
                        headers: {"Content-Type":"text/plain;charset=utf-8"},
                        body: JSON.stringify({
                            action:"verifyPayment",
                            applicationId:application.id,
                            loanIndex:loanIndex,
                            razorpay_order_id:response.razorpay_order_id,
                            razorpay_payment_id:response.razorpay_payment_id,
                            razorpay_signature:response.razorpay_signature
                        })
                    });
                    var verified = await verifyRes.json();
                    if (!verified || !verified.success) throw new Error(verified && verified.error ? verified.error : "Payment verification failed.");
                    alert("Payment successful: " + money(verified.amountPaid || payAmount) + "\nReceipt: " + (verified.receiptId || response.razorpay_payment_id));
                    if (typeof checkStatus === "function") { try { checkStatus(); } catch(e) {} }
                    setTimeout(function(){ location.reload(); }, 900);
                } catch (err) {
                    alert("Payment was received but VD Finance could not verify/update it yet. Payment ID: " + response.razorpay_payment_id + "\nDo not pay again. Contact admin.");
                    console.error(err);
                }
            },
            modal: {ondismiss: function(){ console.log("VD Finance payment window closed."); }}
        };
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function(resp){
            var msg = resp && resp.error && resp.error.description ? resp.error.description : "Payment failed. Please try again.";
            alert(msg);
        });
        rzp.open();
    } catch (err) {
        console.error("VD Finance payment start failed", err);
        alert(err && err.message ? err.message : "Could not start payment. Please try again.");
    }
}

function openCustomerStatementForLoan(loanIndex) {
    /* Accounts tab: open ONLY the statement for the clicked Loan 1 / 2 / 3. */
    var application = window.vdfCurrentStatementApplication;
    if (!application) {
        alert("Please check your application status first.");
        return;
    }

    var history = ensureLoanHistory(application);
    loanIndex = Number(loanIndex);
    if (!Number.isInteger(loanIndex) || loanIndex < 0 || !history[loanIndex]) {
        alert("This loan statement is not available.");
        return;
    }

    window.vdfStatementSelection = String(loanIndex);

    var select = document.getElementById("vdfStatementLoanSelect");
    if (select) {
        select.innerHTML = history.map(function(loan, index) {
            var custom = getLoanDisplayName(application.id, index);
            var text = "Loan " + (index + 1) + (custom ? " — " + custom : "");
            return '<option value="' + index + '">' + escapeHTML(text) + '</option>';
        }).join("");
        select.value = String(loanIndex);
    }

    renderCustomerStatement();

    var overlay = document.getElementById("vdfStatementOverlay");
    if (overlay) {
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }
}

function openCustomerStatement() {
    var application = window.vdfCurrentStatementApplication;
    if (!application) { alert("Please check your application status first."); return; }
    var history = ensureLoanHistory(application);
    window.vdfStatementSelection = "all";
    var select = document.getElementById("vdfStatementLoanSelect");
    if (select) {
        select.innerHTML = '<option value="all">All Statement</option>' + history.map(function(loan,index){ return '<option value="'+index+'">L'+(index+1)+' Statement</option>'; }).join('');
        select.value = "all";
    }
    renderCustomerStatement();
    var overlay = document.getElementById("vdfStatementOverlay");
    if (overlay) { overlay.classList.add("show"); overlay.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
}

function closeCustomerStatement() {
    var overlay = document.getElementById("vdfStatementOverlay");
    if (overlay) { overlay.classList.remove("show"); overlay.setAttribute("aria-hidden","true"); }
    document.body.style.overflow = "";
}

function openCustomerHistoryFromTop() {
    /* The old button tried to scroll to a hidden Accounts panel, so it looked broken.
       Open the visible History tab first, then scroll to it. */
    switchCustomerStatusTab("history");
    window.setTimeout(function() {
        var panel = document.querySelector('#status [data-status-panel="history"]');
        if (panel) panel.scrollIntoView({behavior:"smooth", block:"start"});
    }, 40);
}

function logoutCustomerStatus() {
    var vdfWishZone=document.querySelector("#status .vdf-status-wish-card-zone"); if(vdfWishZone)vdfWishZone.classList.remove("vdf-status-authenticated");
    var vdfSlot=document.getElementById("vdfStatusMemberCardSlot"); if(vdfSlot) vdfSlot.innerHTML="";
    closeCustomerStatement();
    window.vdfCurrentStatementApplication = null;
    window.vdfLastStatusFingerprint = null;
    window.vdfSelectedStatusTab = "overview";
    window.vdfStatusHasChecked = false;
    window.vdfCheckedStatusId = "";
    window.vdfStatusRefreshBusy = false;

    var statusIdField = document.getElementById("statusId");
    var statusResult = document.getElementById("statusResult");
    if (statusIdField) statusIdField.value = "";
    if (statusResult) statusResult.innerHTML = "";
    updateStatusTimeGreeting("");
    showPage("home");
}

async function downloadCustomerStatementPDF() {
    var application = window.vdfCurrentStatementApplication;
    if (!application) { alert("Please check your application status first."); return; }
    if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) { alert("PDF service is still loading. Please tap Download PDF again."); return; }
    renderCustomerStatement();
    var paper=document.getElementById("vdfStatementPaper"); if(!paper)return;
    try{
      var canvas=await window.html2canvas(paper,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false});
      var pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      var pageW=pdf.internal.pageSize.getWidth(), pageH=pdf.internal.pageSize.getHeight(), margin=8;
      var imgW=pageW-margin*2, imgH=canvas.height*imgW/canvas.width;
      var img=canvas.toDataURL("image/jpeg",0.96), y=margin, remaining=imgH;
      pdf.addImage(img,"JPEG",margin,y,imgW,imgH);
      remaining-=pageH-margin*2;
      while(remaining>0){pdf.addPage();y=margin-(imgH-remaining);pdf.addImage(img,"JPEG",margin,y,imgW,imgH);remaining-=pageH-margin*2;}
      var safeId=String(application.id||"customer").replace(/[^A-Za-z0-9_-]/g,"_");
      var suffix=window.vdfStatementSelection==="all"?"All":"L"+(Number(window.vdfStatementSelection)+1);
      var langSuffix=vdfStatementLang==="te"?"Telugu":(vdfStatementLang==="hi"?"Hindi":"English");
      pdf.save("VD_Finance_Statement_"+safeId+"_"+suffix+"_"+langSuffix+".pdf");
    }catch(e){console.error(e);alert("PDF generate avvaledu. Please try again.");}
}

function changeCustomerAccountDateMode(mode) {
    var dayInput = document.getElementById("vdfAccountDateValue");
    var monthInput = document.getElementById("vdfAccountMonthValue");
    if (!dayInput || !monthInput) return;
    dayInput.style.display = mode === "day" ? "inline-block" : "none";
    monthInput.style.display = mode === "month" ? "inline-block" : "none";
    if (mode === "all") {
        dayInput.value = "";
        monthInput.value = "";
    }
    filterCustomerAccountsByDate();
}

function getVdfAccountDateKeys(rawValue) {
    var raw = String(rawValue || "").trim();
    if (!raw) return { day: "", month: "" };
    var match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
        var year = match[1], month = String(match[2]).padStart(2, "0"), day = String(match[3]).padStart(2, "0");
        return { day: year + "-" + month + "-" + day, month: year + "-" + month };
    }
    match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match) {
        var d = String(match[1]).padStart(2, "0"), m = String(match[2]).padStart(2, "0"), y = match[3];
        return { day: y + "-" + m + "-" + d, month: y + "-" + m };
    }
    var parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
        return { day: parsed.getFullYear() + "-" + String(parsed.getMonth() + 1).padStart(2, "0") + "-" + String(parsed.getDate()).padStart(2, "0"), month: parsed.getFullYear() + "-" + String(parsed.getMonth() + 1).padStart(2, "0") };
    }
    return { day: "", month: "" };
}

function filterCustomerAccountsByDate() {
    var list = document.getElementById("vdfCustomerLoanHistoryList");
    var modeEl = document.getElementById("vdfAccountDateMode");
    var dayEl = document.getElementById("vdfAccountDateValue");
    var monthEl = document.getElementById("vdfAccountMonthValue");
    var countEl = document.getElementById("vdfAccountFilterCount");
    if (!list || !modeEl) return;
    var mode = modeEl.value;
    var selectedDay = dayEl ? dayEl.value : "";
    var selectedMonth = monthEl ? monthEl.value : "";
    var cards = Array.prototype.slice.call(list.querySelectorAll(".premium-loan-card[data-loan-created]"));
    var shown = 0;
    cards.forEach(function(card) {
        var keys = getVdfAccountDateKeys(card.getAttribute("data-loan-created"));
        var visible = mode === "all" || (mode === "day" && selectedDay && keys.day === selectedDay) || (mode === "month" && selectedMonth && keys.month === selectedMonth);
        if (mode === "day" && !selectedDay) visible = true;
        if (mode === "month" && !selectedMonth) visible = true;
        card.style.display = visible ? "" : "none";
        if (visible) shown++;
    });
    if (countEl) {
        if (mode === "all") countEl.textContent = "Showing all " + shown + " account(s)";
        else if (mode === "day") countEl.textContent = selectedDay ? (shown ? "Found " + shown + " account(s) for " + selectedDay : "No accounts for this day") : "Choose a day to filter accounts";
        else countEl.textContent = selectedMonth ? (shown ? "Found " + shown + " account(s) for " + selectedMonth : "No accounts for this month") : "Choose a month to filter accounts";
    }
}

function switchCustomerStatusTab(tabName) {
    var result = document.getElementById("statusResult");
    if (!result) return;

    var allowed = ["overview", "accounts", "history"];
    if (allowed.indexOf(tabName) === -1) tabName = "overview";

    /* Remember the selected tab so backend polling can never reset it. */
    window.vdfSelectedStatusTab = tabName;

    result.querySelectorAll("[data-status-tab]").forEach(function(button) {
        var active = button.getAttribute("data-status-tab") === tabName;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    });

    result.querySelectorAll("[data-status-panel]").forEach(function(panel) {
        panel.style.display = panel.getAttribute("data-status-panel") === tabName ? "block" : "none";
    });
}



var vdfAdminOtpChallenge = "";
function adminLogin() {
    var username = document.getElementById("adminUsername").value.trim();
    var password = document.getElementById("adminPassword").value;
    var message = document.getElementById("loginMessage");
    if (!username || !password) { message.className="alert error"; message.textContent="Enter username and password."; return; }
    sessionStorage.removeItem("vdfAdmin"); sessionStorage.removeItem("vdfAdminToken");
    document.getElementById("adminOtpBox").style.display="none";
    message.className="alert success"; message.textContent="Verifying username and password...";
    fetch(GOOGLE_SHEET_WEB_APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"adminLogin",username:username,password:password})})
    .then(function(r){return r.json();}).then(function(result){
        if(!result||result.success!==true||!result.otpRequired||!result.challengeId) throw new Error((result&&result.error)||"Invalid username or password.");
        vdfAdminOtpChallenge=result.challengeId;
        document.getElementById("adminPassword").value="";
        document.getElementById("adminOtp").value="";
        document.getElementById("adminOtpBox").style.display="block";
        message.className="alert success"; message.textContent="OTP sent to the registered admin email. Enter the 4-digit OTP.";
        setTimeout(function(){document.getElementById("adminOtp").focus();},100);
    }).catch(function(err){vdfAdminOtpChallenge="";message.className="alert error";message.textContent=err.message||"Login failed.";});
}
function verifyAdminOtp(){
    var otp=(document.getElementById("adminOtp").value||"").trim();
    var message=document.getElementById("loginMessage");
    if(!vdfAdminOtpChallenge){message.className="alert error";message.textContent="Login again to request a new OTP.";return;}
    if(!/^\d{4}$/.test(otp)){message.className="alert error";message.textContent="Enter the 4-digit OTP.";return;}
    message.className="alert success";message.textContent="Verifying OTP...";
    fetch(GOOGLE_SHEET_WEB_APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"adminVerifyOtp",challengeId:vdfAdminOtpChallenge,otp:otp})})
    .then(function(r){return r.json();}).then(function(result){
        if(!result||result.success!==true||!result.token) throw new Error((result&&result.error)||"Invalid OTP.");
        sessionStorage.setItem("vdfAdmin","true");sessionStorage.setItem("vdfAdminToken",result.token);
        vdfAdminOtpChallenge="";document.getElementById("adminOtp").value="";document.getElementById("adminOtpBox").style.display="none";
        message.className="alert success";message.textContent="Authentication successful.";
        setTimeout(function(){loadAdminApplications();showPage("admin");},250);
    }).catch(function(err){message.className="alert error";message.textContent=err.message||"OTP verification failed.";});
}
function resendAdminOtp(){
    var message=document.getElementById("loginMessage");
    if(!vdfAdminOtpChallenge){message.className="alert error";message.textContent="Login again to request a new OTP.";return;}
    message.className="alert success";message.textContent="Requesting a new OTP...";
    fetch(GOOGLE_SHEET_WEB_APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"adminResendOtp",challengeId:vdfAdminOtpChallenge})})
    .then(function(r){return r.json();}).then(function(result){if(!result||result.success!==true) throw new Error((result&&result.error)||"Could not resend OTP.");document.getElementById("adminOtp").value="";message.className="alert success";message.textContent="A new OTP was sent. The previous OTP is no longer valid.";})
    .catch(function(err){message.className="alert error";message.textContent=err.message||"Could not resend OTP.";});
}


/* ================= ADMIN APPLICATIONS ================= */

function refreshAdminDashboard() {
    var button = document.querySelector('#admin .admin-header button[onclick="refreshAdminDashboard()"]');
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }
    if (window.vdfAdminManualRefreshBusy) return;
    window.vdfAdminManualRefreshBusy = true;
    var originalText = button ? button.textContent : "↻ Refresh";
    if (button) { button.disabled = true; button.textContent = "Refreshing…"; }
    fetchSharedApplications().then(function(result) {
        /* Always redraw from the newest shared response (or local cache on failure). */
        loadAdminApplications(true);
        if (button) button.textContent = result ? "✓ Refreshed" : "⚠ Offline cache";
        window.setTimeout(function() {
            if (button) button.textContent = originalText;
        }, 1800);
    }).catch(function(error) {
        console.warn("Admin refresh failed:", error);
        loadAdminApplications(true);
        if (button) button.textContent = "⚠ Refresh failed";
        window.setTimeout(function() { if (button) button.textContent = originalText; }, 2200);
    }).finally(function() {
        window.vdfAdminManualRefreshBusy = false;
        if (button) button.disabled = false;
    });
}

function closeExistingCustomerForm() {
    var modal = document.getElementById("existingCustomerModal");
    if (modal) modal.remove();
}

function openExistingCustomerForm() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    closeExistingCustomerForm();

    var modal = document.createElement("div");
    modal.id = "existingCustomerModal";
    modal.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;box-sizing:border-box;";

    var box = document.createElement("div");
    box.style.cssText = "width:min(900px,100%);max-height:92vh;overflow:auto;background:linear-gradient(145deg,#18181c,#0f0f12);color:#fff;border:1px solid rgba(233,197,106,.35);border-radius:18px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.55);box-sizing:border-box;";

    box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;">
            <div>
                <h2 style="margin:0;color:#f4d47d;">➕ Add Existing Customer</h2>
                <p style="margin:6px 0 0;color:#cfcfcf;">Manually enter an old loan customer. Data will be saved to the same Applications sheet.</p>
            </div>
            <button type="button" onclick="closeExistingCustomerForm()" style="border:0;background:#333;color:#fff;border-radius:8px;padding:9px 12px;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <form id="existingCustomerForm" onsubmit="saveExistingCustomer(event)">
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;">
                <label style="display:block;color:#f4d47d;font-weight:700;">Application ID (optional)
                    <input id="ecId" type="text" placeholder="Leave blank to generate" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Name *
                    <input id="ecName" required type="text" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Mobile *
                    <input id="ecMobile" required maxlength="10" type="text" inputmode="numeric" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Co-Applicant Number
                    <input id="ecCoApplicant" maxlength="10" type="text" inputmode="numeric" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Email
                    <input id="ecEmail" type="email" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">UPI ID
                    <input id="ecUpi" type="text" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Reason for Apply
                    <input id="ecReason" type="text" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Aadhaar File Name
                    <input id="ecAadhaar" type="text" placeholder="Example: aadhaar.pdf" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;grid-column:1/-1;">Address
                    <textarea id="ecAddress" rows="3" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;resize:vertical;"></textarea>
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;grid-column:1/-1;padding:10px 12px;border:1px solid rgba(244,212,125,.25);border-radius:10px;background:#151515;"><input id="ecManualOverride" type="checkbox" onchange="toggleExistingCustomerManualOverride()" style="margin-right:8px;"> Manual / Custom Values <small style="color:#aaa;font-weight:500;">(OFF = automatic calculation)</small></label><label style="display:block;color:#f4d47d;font-weight:700;">Amount *
                    <input id="ecAmount" required type="number" min="100" step="1" oninput="updateExistingCustomerTotal()" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Period
                    <input id="ecPeriod" type="number" value="30" readonly style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#333;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Loan Taken Date *
                    <input id="ecLoanDate" required type="date" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Repayment / Due Date
                    <input id="ecRepaymentDate" type="date" readonly style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Interest (30%)
                    <input id="ecInterest" type="number" readonly style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#333;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Platform Fee
                    <input id="ecFee" type="number" value="100" readonly style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#333;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Total Payable
                    <input id="ecTotal" type="number" readonly style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#333;color:#fff;">
                </label>
                <label style="display:block;color:#f4d47d;font-weight:700;">Status
                    <select id="ecStatus" style="width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;">
                        <option>Pending</option><option>Approved</option><option>Rejected</option><option>Amount Cleared</option>
                    </select>
                </label>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap;">
                <button type="button" onclick="closeExistingCustomerForm()" style="padding:12px 20px;border:0;border-radius:9px;background:#555;color:#fff;cursor:pointer;">Cancel</button>
                <button type="submit" style="padding:12px 20px;border:0;border-radius:9px;background:linear-gradient(135deg,#c9972d,#a87808);color:#fff;font-weight:800;cursor:pointer;">Save Existing Customer</button>
            </div>
        </form>`;

    modal.appendChild(box);
    document.body.appendChild(modal);

    var today = new Date();
    var todayValue = today.toISOString().slice(0,10);
    var loanDateField = document.getElementById("ecLoanDate");
    if (loanDateField) {
        loanDateField.value = todayValue;
        loanDateField.addEventListener("change", function () {
            var dueField = document.getElementById("ecRepaymentDate");
            if (dueField) dueField.value = calculateExistingCustomerRepaymentDate(this.value);
        });
    }

    var dueField = document.getElementById("ecRepaymentDate");
    if (dueField) dueField.value = calculateExistingCustomerRepaymentDate(todayValue);
}

function calculateExistingCustomerRepaymentDate(dateValue) {
    if (!dateValue) return "";
    var parts = String(dateValue).split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (n) { return !Number.isFinite(n); })) return "";
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + 30);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function toggleExistingCustomerManualOverride() {
    var manual = !!document.getElementById("ecManualOverride")?.checked;
    ["ecPeriod","ecRepaymentDate","ecInterest","ecFee","ecTotal"].forEach(function(id){
        var el=document.getElementById(id); if(!el)return; el.readOnly=!manual; el.style.background=manual?"#222":"#333";
    });
    if(!manual) updateExistingCustomerTotal();
}

function updateExistingCustomerTotal() {
    if (document.getElementById("ecManualOverride")?.checked) return;
    var amount = Number(document.getElementById("ecAmount")?.value || 0);
    var interest = amount * 0.31;
    var total = amount + interest + 100;
    var i = document.getElementById("ecInterest");
    var t = document.getElementById("ecTotal");
    if (i) i.value = interest.toFixed(2);
    if (t) t.value = total.toFixed(2);
}

function saveExistingCustomer(event) {
    event.preventDefault();
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var name = document.getElementById("ecName").value.trim();
    var mobile = document.getElementById("ecMobile").value.trim();
    var coApplicant = document.getElementById("ecCoApplicant").value.trim();
    var amount = Number(document.getElementById("ecAmount").value);
    var period = Number(document.getElementById("ecPeriod")?.value || 30);

    if (!name) { alert("Please enter customer name."); return; }
    if (!/^[0-9]{10}$/.test(mobile)) { alert("Mobile number must be exactly 10 digits."); return; }
    if (coApplicant && !/^[0-9]{10}$/.test(coApplicant)) { alert("Co-applicant number must be exactly 10 digits."); return; }
    if (!amount || amount < 100) { alert("Amount must be at least ₹100."); return; }

    var enteredId = document.getElementById("ecId").value.trim().toUpperCase();
    var interest = amount * 0.31;
    var fee = 100;
    var total = amount + interest + fee;
    var loanTakenDate = document.getElementById("ecLoanDate").value;
    var repaymentDate = calculateExistingCustomerRepaymentDate(loanTakenDate);
    var repaymentField = document.getElementById("ecRepaymentDate");
    if (repaymentField) repaymentField.value = repaymentDate;
    var status = document.getElementById("ecStatus").value;

    if (!loanTakenDate) { alert("Please enter the old loan taken date."); return; }

    var loanDateObj = new Date(loanTakenDate + "T12:00:00");
    var createdAt = isNaN(loanDateObj.getTime()) ? new Date().toISOString() : loanDateObj.toISOString();

    var loans = getLoans();

    function normalizeExistingCustomerName(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .filter(Boolean)
            .sort()
            .join(" ");
    }

    var normalizedExistingName = normalizeExistingCustomerName(name);
    var normalizedExistingMobile = String(mobile || "").replace(/\D/g, "");

    var matchedExistingIndex = -1;
    if (enteredId) {
        matchedExistingIndex = loans.findIndex(function(item) {
            return String(item.id || "").trim().toUpperCase() === enteredId;
        });
    } else {
        matchedExistingIndex = loans.findIndex(function(item) {
            var savedName = normalizeExistingCustomerName(item.name);
            var savedMobile = String(item.mobile || "").replace(/\D/g, "");
            return normalizedExistingName && normalizedExistingMobile &&
                   savedName === normalizedExistingName &&
                   savedMobile === normalizedExistingMobile;
        });
    }

    var existingApplication = matchedExistingIndex >= 0 ? loans[matchedExistingIndex] : null;
    var id = existingApplication
        ? String(existingApplication.id || "").trim().toUpperCase()
        : (enteredId || generateApplicationId());

    var transaction;

    if (existingApplication) {
        /* IMPORTANT: Never replace an old loan. Keep every loan as its own object. */
        var history = ensureLoanHistory(existingApplication).map(function(oldLoan, index) {
            var copy = Object.assign({}, oldLoan);
            copy.loanNumber = Number(copy.loanNumber) > 0 ? Number(copy.loanNumber) : (index + 1);
            if (!copy.repaymentDate) {
                copy.repaymentDate = calculateExistingCustomerRepaymentDate(
                    copy.createdAt || existingApplication.createdAt || ""
                );
            }
            return copy;
        });

        transaction = {
            loanNumber: history.length + 1,
            amount: amount,
            period: period,
            interest: interest,
            fee: fee,
            total: total,
            repaymentDate: repaymentDate,
            status: status,
            createdAt: createdAt
        };
        history.push(transaction);

        /* Preserve the customer's identity/details, but keep the COMPLETE loan history. */
        var updatedApplication = Object.assign({}, existingApplication, {
            id: id,
            name: name,
            mobile: mobile,
            coApplicant: coApplicant,
            email: document.getElementById("ecEmail").value.trim() || existingApplication.email || "",
            upiId: document.getElementById("ecUpi").value.trim() || existingApplication.upiId || "",
            loanReason: document.getElementById("ecReason").value.trim() || existingApplication.loanReason || "",
            address: document.getElementById("ecAddress").value.trim() || existingApplication.address || "",
            aadhaarFileName: document.getElementById("ecAadhaar").value.trim() || existingApplication.aadhaarFileName || "",
            /* These summary fields represent the newly added loan only. */
            amount: amount,
            period: period,
            interest: interest,
            fee: fee,
            total: total,
            repaymentDate: repaymentDate,
            status: status,
            userAccess: history.some(function(loan) { return loan.status !== "Amount Cleared"; }),
            createdAt: existingApplication.createdAt || createdAt,
            lastUpdated: new Date().toISOString(),
            loanNumber: transaction.loanNumber,
            loanHistory: history
        });

        loans[matchedExistingIndex] = updatedApplication;
    } else {
        transaction = {
            loanNumber: 1,
            amount: amount,
            period: period,
            interest: interest,
            fee: fee,
            total: total,
            repaymentDate: repaymentDate,
            status: status,
            createdAt: createdAt
        };

        loans.push({
            id: id,
            name: name,
            mobile: mobile,
            coApplicant: coApplicant,
            email: document.getElementById("ecEmail").value.trim(),
            upiId: document.getElementById("ecUpi").value.trim(),
            loanReason: document.getElementById("ecReason").value.trim(),
            address: document.getElementById("ecAddress").value.trim(),
            aadhaarFileName: document.getElementById("ecAadhaar").value.trim(),
            amount: amount,
            period: period,
            interest: interest,
            fee: fee,
            total: total,
            repaymentDate: repaymentDate,
            status: status,
            userAccess: status !== "Amount Cleared",
            createdAt: createdAt,
            lastUpdated: new Date().toISOString(),
            loanNumber: 1,
            loanHistory: [transaction]
        });
        matchedExistingIndex = loans.length - 1;
    }

    var application = loans[matchedExistingIndex];

    saveLoans(loans);
    recordDashboardStatusChange(transaction, status);
    syncToGoogleSheet("existingCustomer", application);

    /* Send the email for THIS newly created loan only. Never use the latest
       top-level summary fields to decide the loan number or amount. */
    var newLoanIndex = application.loanHistory.length - 1;
    sendExistingCustomerLoanEmail(application, newLoanIndex);

    closeExistingCustomerForm();
    loadAdminApplications(false);
    alert("Existing customer saved successfully. Application ID: " + id + " | Loan " + transaction.loanNumber);
}

var vdfAdminRefreshTimer = null;
var vdfAdminActionBusy = false;

function startVdfAdminAutoRefresh() {
    if (vdfAdminRefreshTimer) return;
    vdfAdminRefreshTimer = setInterval(function() {
        if (sessionStorage.getItem("vdfAdmin") === "true" && !vdfAdminActionBusy) {
            loadAdminApplications(false);
        }
    }, 10000);
}
window.addEventListener("focus", function() {
    if (sessionStorage.getItem("vdfAdmin") === "true" && !vdfAdminActionBusy) loadAdminApplications(false);
});

function updateActiveApplicationsCount(loans) {
    var element = document.getElementById("activeApplicationsCount");
    if (!element) return;

    var activeCount = 0;

    (Array.isArray(loans) ? loans : []).forEach(function(application) {
        var history = ensureLoanHistory(application);
        var hasActiveLoan = history.some(function(loan) {
            return String(loan.status || "").trim().toLowerCase() === "approved";
        });

        if (hasActiveLoan) activeCount++;
    });

    element.textContent = String(activeCount);
}

function toggleAdminActions(rowIndex) {
    var panel = document.getElementById("adminActions_" + rowIndex);
    var button = document.getElementById("adminViewButton_" + rowIndex);
    if (!panel || !button) return;

    var isHidden = panel.style.display === "none" || !panel.style.display;
    panel.style.display = isHidden ? "flex" : "none";
    button.textContent = isHidden ? "Hide" : "View";
    button.setAttribute("aria-expanded", isHidden ? "true" : "false");
}

function toggleVdfAdminViewMenu() {
    var panel = document.getElementById("vdfAdminViewMenu");
    var button = document.getElementById("vdfAdminViewMenuButton");
    if (!panel || !button) return;
    var opening = panel.style.display === "none" || !panel.style.display;
    panel.style.display = opening ? "flex" : "none";
    button.textContent = opening ? "View ▴" : "View ▾";
    button.setAttribute("aria-expanded", opening ? "true" : "false");
}

function closeVdfAdminViewMenu() {
    var panel = document.getElementById("vdfAdminViewMenu");
    var button = document.getElementById("vdfAdminViewMenuButton");
    if (panel) panel.style.display = "none";
    if (button) {
        button.textContent = "View ▾";
        button.setAttribute("aria-expanded", "false");
    }
}

function setAdminLoanTypeFilter(type) {
    window.vdfAdminActiveOnly = false;
    window.vdfAdminLoanTypeFilter = type === "daily" || type === "monthly" ? type : "all";
    /* A customer selected under the previous filter must not hide the new filter results. */
    window.vdfAdminSelectedCustomerId = "";
    closeVdfAdminViewMenu();
    loadAdminApplications(true);
}

function setActiveLoanPeriodFilter(mode) {
    window.vdfActiveLoanPeriodMode = (mode === "day" || mode === "month") ? mode : "all";
    var day = document.getElementById("vdActiveLoanDayFilter");
    var month = document.getElementById("vdActiveLoanMonthFilter");
    if (day) day.style.display = window.vdfActiveLoanPeriodMode === "day" ? "block" : "none";
    if (month) month.style.display = window.vdfActiveLoanPeriodMode === "month" ? "block" : "none";
    refreshActiveLoanPeriodFilter();
}
function refreshActiveLoanPeriodFilter() {
    var monthSelect = document.getElementById("adminMonth");
    if (monthSelect && monthSelect.value) renderVdAdminAnalytics(monthSelect.value);
}

function toggleActiveLoanViewMenu() {
    var menu = document.getElementById("vdActiveLoanViewMenu");
    var button = document.getElementById("vdActiveLoanViewButton");
    if (!menu) return;
    var opening = !menu.classList.contains("open");
    menu.classList.toggle("open", opening);
    menu.setAttribute("aria-hidden", opening ? "false" : "true");
    if (button) button.setAttribute("aria-expanded", opening ? "true" : "false");
}
function closeActiveLoanViewMenu() {
    var menu = document.getElementById("vdActiveLoanViewMenu");
    var button = document.getElementById("vdActiveLoanViewButton");
    if (menu) {
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
    }
    if (button) button.setAttribute("aria-expanded", "false");
}

function setActiveLoanView(type) {
    window.vdfAdminLoanTypeFilter = type === "daily" || type === "monthly" ? type : "all";
    window.vdfAdminActiveOnly = true;
    window.vdfAdminSelectedCustomerId = "";
    closeActiveLoanViewMenu();
    closeVdfAdminViewMenu();
    loadAdminApplications(true);
}

window.vdfAdminSelectedCustomerId = window.vdfAdminSelectedCustomerId || "";

function openAdminCustomerLoans(customerId) {
    window.vdfAdminSelectedCustomerId = String(customerId || "");
    closeVdfAdminViewMenu();
    loadAdminApplications(true);
}

function backToAdminCustomerList() {
    window.vdfAdminSelectedCustomerId = "";
    closeVdfAdminViewMenu();
    loadAdminApplications(true);
}

function deleteAdminCustomerAccount(id) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var loans = getLoans();
    var index = loans.findIndex(function(item) { return String(item.id) === String(id); });
    if (index < 0) { alert("Account not found."); return; }
    var application = loans[index];
    if (!confirm("Move this account and all its loan history to the Recycle Bin? You can restore it later.")) return;
    moveVdfItemToTrash({ type: "account", application: JSON.parse(JSON.stringify(application)) });
    loans.splice(index, 1);
    saveLoans(loans);
    syncToGoogleSheet("delete", application);
    window.vdfAdminSelectedCustomerId = "";
    loadAdminApplications(true);
}


/* Toolbar delete actions: choose a customer here, rather than showing delete buttons on every loan row. */
function getAdminCustomerForToolbar(actionLabel) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return null; }
    var loans = getLoans();
    if (!loans.length) { alert("No customer accounts found."); return null; }
    var choices = loans.map(function(app) {
        return String(app.id) + " — " + String(app.name || "Customer") + " (" + ensureLoanHistory(app).length + " loans)";
    }).join("\n");
    var id = prompt("Enter the Customer ID for " + actionLabel + ":\n\n" + choices);
    if (id === null) return null;
    id = id.trim();
    var customer = loans.find(function(app) { return String(app.id) === id; });
    if (!customer) { alert("Customer ID not found. Please enter the exact ID shown in the list."); return null; }
    return customer;
}
function adminToolbarDeleteLoan() {
    var customer = getAdminCustomerForToolbar("Delete Loan");
    if (customer) chooseLoanForDelete(String(customer.id));
}
function adminToolbarDeleteCustomer() {
    var customer = getAdminCustomerForToolbar("Delete Customer");
    if (customer) deleteAdminCustomerAccount(String(customer.id));
}

/* One Delete button opens a guided selector for either a full customer account
   or a single loan. Native select controls avoid requiring the admin to type IDs. */
function openUnifiedDeleteMenu() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var old = document.getElementById("vdfUnifiedDeleteModal"); if (old) old.remove();
    var customers = getLoans();
    if (!customers.length) { alert("No customer accounts found."); return; }
    var modal = document.createElement("div");
    modal.id = "vdfUnifiedDeleteModal";
    modal.style.cssText = "position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
    var box = document.createElement("div");
    box.style.cssText = "width:min(520px,100%);background:#111;color:#fff;border:1px solid #d9a928;border-radius:16px;padding:22px;box-shadow:0 20px 60px #0008;";
    box.innerHTML = '<h3 style="margin:0 0 16px;color:#f4d47d;">🗑️ Delete Customer / Loan</h3>' +
      '<label for="vdfDeleteType" style="display:block;margin:10px 0 6px;">What do you want to delete?</label>' +
      '<select id="vdfDeleteType" style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;"><option value="customer">Customer account (all loans)</option><option value="loan">One loan only</option></select>' +
      '<label for="vdfDeleteCustomer" style="display:block;margin:10px 0 6px;">Select customer</label>' +
      '<select id="vdfDeleteCustomer" style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;">' + customers.map(function(c){return '<option value="'+escapeHTML(String(c.id))+'">'+escapeHTML(String(c.name||"Customer"))+' — '+escapeHTML(String(c.id))+' ('+ensureLoanHistory(c).length+' loans)</option>';}).join('') + '</select>' +
      '<div id="vdfDeleteLoanChooser" style="display:none;"><label for="vdfDeleteLoanIndex" style="display:block;margin:10px 0 6px;">Select loan</label><select id="vdfDeleteLoanIndex" style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;"></select></div>' +
      '<p style="font-size:12px;color:#c8c0ad;line-height:1.5;">Items are moved to the Recycle Bin first, so you can restore them.</p>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px;"><button type="button" id="vdfDeleteCancel" class="btn btn-primary">Cancel</button><button type="button" id="vdfDeleteConfirm" class="btn btn-danger">Continue</button></div>';
    modal.appendChild(box); document.body.appendChild(modal);
    var typeEl=box.querySelector('#vdfDeleteType'), customerEl=box.querySelector('#vdfDeleteCustomer'), loanWrap=box.querySelector('#vdfDeleteLoanChooser'), loanEl=box.querySelector('#vdfDeleteLoanIndex');
    function fillLoanChoices() {
      var c=customers.find(function(item){return String(item.id)===String(customerEl.value);});
      var history=c?ensureLoanHistory(c):[];
      loanEl.innerHTML=history.map(function(l,i){return '<option value="'+i+'">Loan '+(i+1)+' — '+escapeHTML(money(l.amount))+' — '+escapeHTML(String(l.status||'Pending'))+'</option>';}).join('');
      loanWrap.style.display=typeEl.value==='loan'?'block':'none';
      box.querySelector('#vdfDeleteConfirm').disabled=(typeEl.value==='loan' && !history.length);
    }
    typeEl.addEventListener('change',fillLoanChoices); customerEl.addEventListener('change',fillLoanChoices);
    box.querySelector('#vdfDeleteCancel').onclick=function(){modal.remove();};
    box.querySelector('#vdfDeleteConfirm').onclick=function(){
      var customer=customers.find(function(item){return String(item.id)===String(customerEl.value);});
      if(!customer){alert('Please select a valid customer.');return;}
      var mode=typeEl.value, id=String(customer.id); modal.remove();
      if(mode==='customer') deleteAdminCustomerAccount(id);
      else chooseLoanForDelete(id, Number(loanEl.value));
    };
    fillLoanChoices();
}


/* ================= RECYCLE BIN ================= */
function getVdfTrashItems() {
    try { return JSON.parse(localStorage.getItem("vdfTrashBin") || "[]"); }
    catch (e) { return []; }
}
function saveVdfTrashItems(items) {
    localStorage.setItem("vdfTrashBin", JSON.stringify(items));
    renderVdfTrashBin();
}
function moveVdfItemToTrash(item) {
    var bin = getVdfTrashItems();
    item.deletedAt = new Date().toISOString();
    item.trashId = "TRASH-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
    bin.unshift(item);
    saveVdfTrashItems(bin);
}
function toggleVdfTrashBin() {
    var panel = document.getElementById("vdfTrashBinPanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "block" ? "none" : "block";
    renderVdfTrashBin();
}
function renderVdfTrashBin() {
    var bin = getVdfTrashItems();
    var count = document.getElementById("vdfTrashCount");
    var box = document.getElementById("vdfTrashBinItems");
    if (count) count.textContent = String(bin.length);
    if (!box) return;
    if (!bin.length) {
        box.innerHTML = '<p style="margin:0;color:#bdb6a5;">Bin is empty.</p>';
        return;
    }
    box.innerHTML = bin.map(function(item) {
        var label = item.type === "account"
            ? "Account: " + ((item.application && item.application.name) || "Unknown") + " (" + ((item.application && item.application.id) || "") + ")"
            : "Loan: L" + (Number(item.loanIndex || 0) + 1) + " — " + ((item.application && item.application.name) || "Unknown");
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid rgba(212,175,55,.20);color:#f7f1df;">' +
            '<span>' + escapeHTML(label) + '</span><span>' +
            '<button type="button" class="btn-success" onclick="restoreVdfTrashItem(&quot;' + item.trashId + '&quot;)">↩ Restore</button> ' +
            '<button type="button" class="btn-danger" onclick="permanentlyDeleteVdfTrashItem(&quot;' + item.trashId + '&quot;)">Delete Forever</button></span></div>';
    }).join("");
}
function restoreVdfTrashItem(trashId) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var bin = getVdfTrashItems();
    var idx = bin.findIndex(function(x) { return x.trashId === trashId; });
    if (idx < 0) return;
    var item = bin[idx];
    var loans = getLoans();
    if (item.type === "account") {
        var app = item.application;
        if (loans.some(function(x) { return String(x.id) === String(app.id); })) {
            alert("This account already exists. Restore cancelled.");
            return;
        }
        loans.push(app);
        saveLoans(loans);
        var restoredAccounts = getVdfRestoredAccountCache();
        restoredAccounts = restoredAccounts.filter(function(x) {
            return String(x.id || '').trim().toUpperCase() !== String(app.id || '').trim().toUpperCase();
        });
        restoredAccounts.push(JSON.parse(JSON.stringify(app)));
        saveVdfRestoredAccountCache(restoredAccounts);
        syncToGoogleSheet("add", app);
    } else if (item.type === "loan") {
        var appIndex = loans.findIndex(function(x) { return String(x.id) === String(item.applicationId); });
        if (appIndex < 0) {
            alert("The customer account is not active. Restore the account first.");
            return;
        }
        var app = loans[appIndex];
        var history = ensureLoanHistory(app);
        history.splice(Math.min(Number(item.loanIndex || 0), history.length), 0, item.loan);
        app.loanHistory = history;
        var latest = history[history.length - 1];
        app.amount = latest.amount; app.period = latest.period; app.interest = latest.interest;
        app.fee = latest.fee; app.total = latest.total; app.repaymentDate = latest.repaymentDate;
        app.status = latest.status;
        app.userAccess = history.some(function(loan) { return loan.status !== "Amount Cleared"; });
        saveLoans(loans);
        syncToGoogleSheet("update", app);
    }
    bin.splice(idx, 1);
    localStorage.setItem("vdfTrashBin", JSON.stringify(bin));
    renderVdfTrashBin();
    loadAdminApplications(true);
    alert("Restored from Bin.");
}
function permanentlyDeleteVdfTrashItem(trashId) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    if (!confirm("Delete this item forever from the Bin? This cannot be undone.")) return;
    localStorage.setItem("vdfTrashBin", JSON.stringify(getVdfTrashItems().filter(function(x) { return x.trashId !== trashId; })));
    renderVdfTrashBin();
}
function emptyVdfTrashBin() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    if (!confirm("Permanently remove every item in the Bin? This cannot be undone.")) return;
    localStorage.setItem("vdfTrashBin", "[]");
    renderVdfTrashBin();
}

function openAdminAadhaar(applicationId) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }
    var wanted = String(applicationId || "").trim().toUpperCase();
    var application = getLoans().find(function(item) {
        return String(item.id || "").trim().toUpperCase() === wanted;
    });
    if (!application) {
        alert("Aadhaar record was not found. Refresh the Admin page and try again.");
        return;
    }

    // Prefer the private Google Drive file saved by the backend.
    if (application.aadhaarFileId) {
        var driveUrl = "https://drive.google.com/file/d/" + encodeURIComponent(application.aadhaarFileId) + "/view";
        var driveTab = window.open(driveUrl, "_blank", "noopener,noreferrer");
        if (!driveTab) window.location.href = driveUrl;
        return;
    }

    // Older records may still have the file's data URL in this browser only.
    var dataUrl = application.aadhaarFile;
    if (typeof dataUrl === "string" && dataUrl.indexOf("data:") === 0) {
        try {
            var parts = dataUrl.split(",");
            var mimeMatch = /^data:([^;]+)/i.exec(parts[0]);
            var mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
            var binary = atob(parts[1] || "");
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            var blob = new Blob([bytes], { type: mime });
            var objectUrl = URL.createObjectURL(blob);
            var opened = window.open(objectUrl, "_blank", "noopener");
            if (!opened) {
                var link = document.createElement("a");
                link.href = objectUrl;
                link.target = "_blank";
                link.rel = "noopener";
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            setTimeout(function() { URL.revokeObjectURL(objectUrl); }, 60000);
            return;
        } catch (error) {
            console.error("Unable to open Aadhaar file:", error);
        }
    }
    alert("Aadhaar file is not stored on the server for this older record. Please open the dashboard on the device where it was uploaded, or edit/re-upload the Aadhaar after deploying the updated Apps Script backend.");
}

function loadAdminApplications(skipSheetRefresh) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    function renderAdminFromCurrentData() {

            var loans = getLoans();
            renderVdfTrashBin();

            updateActiveApplicationsCount(loans);
            setupAdminMonthSelector(loans);
            updateAdminMonthlyDashboard();

            var tbody = document.getElementById("adminTableBody");
            var noApplications = document.getElementById("noApplications");

            tbody.innerHTML = "";

            var selectedLoanType = window.vdfAdminLoanTypeFilter || "all";
            var visibleLoanRows = [];
            loans.forEach(function(application) {
                var history = ensureLoanHistory(application);
                history.forEach(function(loan, loanIndex) {
                    var period = Number(loan.period || application.period || 30);
                    var isDaily = period > 0 && period < 30;
                    if (selectedLoanType === "daily" && !isDaily) return;
                    if (selectedLoanType === "monthly" && isDaily) return;
                    if (window.vdfAdminActiveOnly) {
                        var activeStatus = String(loan.status || application.status || "").trim().toLowerCase();
                        if (activeStatus !== "approved" && activeStatus !== "active") return;
                    }
                    visibleLoanRows.push({ application: application, loan: loan, loanIndex: loanIndex, history: history });
                });
            });

            var groupBox = document.getElementById("vdfAdminCustomerGroups");
            var tableWrap = document.getElementById("vdfAdminLoanTableWrap");
            var selectedCustomerId = String(window.vdfAdminSelectedCustomerId || "");
            if (selectedLoanType === "daily" || selectedLoanType === "monthly") {
                var grouped = {};
                visibleLoanRows.forEach(function(item) {
                    var key = String(item.application.id || "");
                    if (!grouped[key]) grouped[key] = { application: item.application, loans: [] };
                    grouped[key].loans.push(item);
                });
                if (!selectedCustomerId) {
                    if (groupBox) {
                        groupBox.style.display = "grid";
                        groupBox.style.gridTemplateColumns = "repeat(auto-fit,minmax(230px,1fr))";
                        groupBox.style.gap = "10px";
                        var customerKeys = Object.keys(grouped);
                        groupBox.innerHTML = customerKeys.map(function(key) {
                            var g = grouped[key], a = g.application;
                            return '<div style="border:1px solid rgba(233,197,106,.3);border-radius:12px;padding:14px;background:rgba(255,255,255,.035);color:#f5f1e8;">' +
                                '<div style="font-weight:900;font-size:16px;margin-bottom:6px;">' + escapeHTML(a.name || "Customer") + '</div>' +
                                '<div style="font-size:12px;color:#aeb9c9;margin-bottom:10px;">' + escapeHTML(a.mobile || "") + '<br>Application: ' + escapeHTML(a.id || "") + '<br>' + g.loans.length + ' loan(s)</div>' +
                                '<button type="button" class="btn-primary" onclick="openAdminCustomerLoans(decodeURIComponent(\'' + encodeURIComponent(key) + '\'))">View Loans</button> ' +
                                (selectedLoanType !== "monthly" ? '<button type="button" class="btn-danger" onclick="deleteAdminCustomerAccount(decodeURIComponent(\'' + encodeURIComponent(key) + '\'))">Delete Account</button>' : '') +
                                '</div>';
                        }).join("");
                    }
                    if (tableWrap) tableWrap.style.display = "none";
                    noApplications.style.display = Object.keys(grouped).length ? "none" : "block";
                    if (!Object.keys(grouped).length) noApplications.textContent = "No loan applications found.";
                    startVdfAdminAutoRefresh();
                    return;
                }
                visibleLoanRows = visibleLoanRows.filter(function(item) { return String(item.application.id || "") === selectedCustomerId; });
                if (groupBox) {
                    groupBox.style.display = "block";
                    groupBox.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;"><strong style="color:#f4d47d;">' + escapeHTML((grouped[selectedCustomerId] && grouped[selectedCustomerId].application.name) || "Customer Loans") + '</strong><button type="button" class="btn-primary" onclick="backToAdminCustomerList()">← Back to Names</button></div>';
                }
                if (tableWrap) tableWrap.style.display = "block";
            } else {
                if (groupBox) { groupBox.style.display = "none"; groupBox.innerHTML = ""; }
                if (tableWrap) tableWrap.style.display = "block";
                window.vdfAdminSelectedCustomerId = "";
            }

            if (visibleLoanRows.length === 0) {
                noApplications.style.display = "block";
                startVdfAdminAutoRefresh();
                return;
            }

            noApplications.style.display = "none";

            visibleLoanRows.forEach(function(loanRow, adminRowIndex) {

                var application = loanRow.application;
                var history = loanRow.history;
                var latest = loanRow.loan;
                var loanIndex = loanRow.loanIndex;

                var row = document.createElement("tr");

                var actionButtons = '<div class="admin-action-buttons" id="adminActions_' + adminRowIndex + '" style="display:none;margin-top:8px;">';

                actionButtons += `
                    <button type="button" class="btn-success"
                        onclick="chooseLoanForStatus('${application.id}', 'Approved', ${loanIndex})">
                        Approve
                    </button>`;

                actionButtons += `
                    <button type="button" class="btn-danger"
                        onclick="chooseLoanForStatus('${application.id}', 'Rejected', ${loanIndex})">
                        Reject
                    </button>`;

                actionButtons += `
                    <button type="button" class="btn-success"
                        onclick="chooseLoanForClear('${application.id}', ${loanIndex})">
                        Amount Cleared
                    </button>`;


                actionButtons += `
                    <button type="button" class="btn-primary"
                        onclick="sendAdminEmail('${application.id}')">
                        Send Email
                    </button>`;

                actionButtons += '</div>';

                row.innerHTML = `
                    <td>${escapeHTML(application.id)}</td>
                    <td><strong>L${loanIndex + 1}</strong></td>
                    <td>${escapeHTML(application.name)}</td>
                    <td>${escapeHTML(application.mobile)}</td>
                    <td>${escapeHTML(application.coApplicant || "")}</td>
                    <td>${escapeHTML(application.email)}</td>
                    <td>${escapeHTML(application.upiId || "")}</td>
                    <td>${escapeHTML(application.loanReason)}</td>
                    <td>${escapeHTML(application.address)}</td>
                    <td style="min-width:130px;">
                        <button type="button" class="btn-primary" style="white-space:nowrap;" onclick="openAdminAadhaar('${String(application.id || '').replace(/'/g, "\'")}')">📄 Open Aadhaar</button>
                        <div style="font-size:11px;color:#8f8a80;margin-top:5px;max-width:160px;overflow-wrap:anywhere;">${escapeHTML(application.aadhaarFileName || "Aadhaar not uploaded")}</div>
                    </td>
                    <td>${money(latest.amount)}</td>
                    <td>${latest.period} Days</td>
                    <td>${escapeHTML(formatAdminRepaymentDate(latest.repaymentDate || getRepaymentDateFromCreatedAt(latest.createdAt)))}</td>
                    <td>${money(latest.interest)}</td>
                    <td>${money(latest.fee)}</td>
                    <td>${money(latest.total)}</td>
                    <td>
                        <span class="status ${getLoanStatusClass(latest.status)}">
                            ${escapeHTML(latest.status || "Pending")}
                        </span>
                    </td>
                    <td style="vertical-align:top;">
                        <button type="button" class="btn-primary" onclick="toggleAdminActions(${adminRowIndex})" aria-expanded="false" id="adminViewButton_${adminRowIndex}">View</button>
                        ${actionButtons}
                    </td>
                `;

                tbody.appendChild(row);
            });

            startVdfAdminAutoRefresh();
    }

    /* Hosted Admin uses the shared backend so customer requests from other
       phones/browsers appear here. Local storage is only the fallback cache. */
    if (skipSheetRefresh === true) {
        renderAdminFromCurrentData();
        return;
    }

    fetchSharedApplications().finally(function() {
        renderAdminFromCurrentData();
    });
}

function chooseApplicationIdForAdmin(actionLabel, callback) {

    var loans = getLoans();

    if (!loans.length) {
        alert("No customer data is available.");
        return;
    }

    var oldModal = document.getElementById("vdfApplicationIdSelector");
    if (oldModal) oldModal.remove();

    var modal = document.createElement("div");
    modal.id = "vdfApplicationIdSelector";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;";

    var box = document.createElement("div");
    box.style.cssText = "background:#10151d;color:#f7f7f7;border:1px solid #b88b2e;border-radius:16px;padding:22px;width:min(430px,100%);box-shadow:0 22px 65px rgba(0,0,0,.55);";

    var title = document.createElement("h3");
    title.textContent = "Select Application ID - " + actionLabel;
    title.style.cssText = "margin:0 0 14px;color:#e8bd55;";

    var label = document.createElement("div");
    label.textContent = "Available Application IDs";
    label.style.cssText = "font-weight:700;margin-bottom:8px;color:#c8cbd0;";

    var select = document.createElement("select");
    select.size = Math.min(6, loans.length);
    select.style.cssText = "width:100%;padding:11px;border:1px solid #4b5563;border-radius:10px;font-size:16px;max-height:240px;overflow-y:auto;background:#0b0f15;color:#fff;outline:none;";

    loans.forEach(function(item, index) {
        if (!item.id) return;
        var option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.id + (item.name ? " - " + item.name : "");
        if (index === 0) option.selected = true;
        select.appendChild(option);
    });

    var buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:10px;margin-top:16px;justify-content:flex-end;flex-wrap:wrap;";

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = "padding:10px 18px;border:1px solid #3b414c;border-radius:9px;background:#1a2029;color:#fff;cursor:pointer;";

    var selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.textContent = "Select";
    selectBtn.style.cssText = "padding:10px 18px;border:1px solid #d5ad54;border-radius:9px;background:#b88b2e;color:#111;font-weight:800;cursor:pointer;";

    cancel.addEventListener("click", function() {
        modal.remove();
    });

    selectBtn.addEventListener("click", function() {
        var id = select.value;
        if (!id) {
            alert("Please select an Application ID.");
            return;
        }
        modal.remove();
        callback(id);
    });


    buttons.appendChild(cancel);
    buttons.appendChild(selectBtn);
    box.appendChild(title);
    box.appendChild(label);
    box.appendChild(select);
    box.appendChild(buttons);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

function closeVdfHistoryBrowser() {
    var modal = document.getElementById("vdfHistoryBrowserModal");
    if (modal) modal.remove();
}

function openVdfHistoryCustomer(id) {
    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id || "") === String(id || ""); });
    if (!application) { alert("Application not found."); return; }
    var history = ensureLoanHistory(application);
    var body = document.getElementById("vdfHistoryBrowserBody");
    if (!body) return;
    var rows = history.map(function(loan, index) {
        var due = loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period);
        var dueText = formatVdfDate(due);
        var days = getDaysUntilDue(dueText);
        var dueState = days === null ? "" : (days > 0 ? "Due in " + days + " days" : days === 0 ? "Due Today" : "Overdue by " + Math.abs(days) + " days");
        return '<div style="border:1px solid #333;border-radius:14px;padding:14px;background:#101010;margin:10px 0;">' +
            '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><strong style="color:#f4d47d;font-size:17px;">Loan '+(index+1)+'</strong><span style="font-weight:800;">'+escapeHTML(getLoanStatusDisplay(loan.status || "Pending"))+'</span></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-top:10px;font-size:13px;color:#ddd;">' +
            '<div>Amount<br><b>'+money(loan.amount)+'</b></div><div>Interest<br><b>'+money(loan.interest)+'</b></div><div>Total<br><b>'+money(loan.total)+'</b></div>' +
            '<div>Due Date<br><b>'+escapeHTML(dueText || "Not set")+'</b></div><div>Due Status<br><b>'+escapeHTML(dueState || "—")+'</b></div><div>Opened<br><b>'+escapeHTML(loan.createdAt || "—")+'</b></div></div></div>';
    }).join("");
    body.innerHTML = '<button type="button" class="btn btn-primary" onclick="renderVdfHistoryCustomerList()">← Back to Customers</button>' +
        '<div style="margin:16px 0 8px;"><h3 style="margin:0;color:#f4d47d;">'+escapeHTML(application.name || "Customer")+'</h3><div style="color:#aaa;font-size:13px;margin-top:4px;">'+escapeHTML(application.mobile || "")+' • '+escapeHTML(application.id || "")+'</div></div>' + rows;
}

function renderVdfHistoryCustomerList() {
    var body = document.getElementById("vdfHistoryBrowserBody");
    if (!body) return;
    var loans = getLoans();
    body.innerHTML = loans.length ? loans.map(function(application) {
        var history = ensureLoanHistory(application);
        var active = history.filter(function(l){ var st=String(l.status||"").toLowerCase(); return st === "approved" || st === "active"; }).length;
        return '<button type="button" onclick="openVdfHistoryCustomer(decodeURIComponent(\''+encodeURIComponent(String(application.id||""))+'\'))" style="width:100%;text-align:left;border:1px solid #303030;border-radius:13px;padding:14px;margin:7px 0;background:#101010;color:#fff;cursor:pointer;">' +
            '<strong style="color:#f4d47d;font-size:16px;">'+escapeHTML(application.name || "Customer")+'</strong><span style="float:right;color:#ddd;">'+history.length+' Loan(s)</span>' +
            '<div style="font-size:12px;color:#aaa;margin-top:5px;">'+escapeHTML(application.mobile || "")+' • '+escapeHTML(application.id || "")+' • Active: '+active+'</div></button>';
    }).join("") : '<div style="padding:25px;text-align:center;color:#aaa;">No customer history found.</div>';
}

function viewLoanHistoryFromTopDashboard() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    closeVdfHistoryBrowser();
    var modal = document.createElement("div");
    modal.id = "vdfHistoryBrowserModal";
    modal.style.cssText = "position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;box-sizing:border-box;";
    modal.innerHTML = '<div style="width:min(850px,100%);max-height:92vh;overflow:auto;background:#080808;color:#fff;border:1px solid #c9972d;border-radius:18px;padding:20px;box-shadow:0 22px 70px rgba(0,0,0,.7);box-sizing:border-box;">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;"><div><h2 style="margin:0;color:#f4d47d;">Loan History</h2><p style="margin:5px 0 0;color:#aaa;">Select a customer to view their loans, amounts and due details.</p></div><button type="button" onclick="closeVdfHistoryBrowser()" style="border:0;background:#222;color:#fff;border-radius:9px;padding:9px 12px;font-size:18px;">✕</button></div><div id="vdfHistoryBrowserBody"></div></div>';
    document.body.appendChild(modal);
    renderVdfHistoryCustomerList();
}

function setAdminPopupFromTopDashboard() {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    chooseApplicationIdForAdmin("Popup / Note", function(id) {
        setAdminPopup(id);
    });
}

function viewLoanHistory(id) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var application = loans.find(function(item) {
        return String(item.id) === String(id);
    });

    if (!application) {
        alert("Application not found.");
        return;
    }

    var history = ensureLoanHistory(application);

    var text = "Application ID: " + application.id +
        "\nCustomer: " + application.name +
        "\nMobile: " + application.mobile +
        "\n\n";

    history.forEach(function(loan, index) {
        text +=
            "Loan " + (index + 1) +
            "\nAmount: " + money(loan.amount) +
            "\nInterest: " + money(loan.interest) +
            "\nFee: " + money(loan.fee) +
            "\nTotal: " + money(loan.total) +
            "\nDue Date: " + (loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period)) +
            "\nStatus: " + (loan.status || "Pending") +
            "\n-------------------------\n";
    });

    if (application.adminNote) {
        text += "\nAdmin Popup / Note:\n" + application.adminNote;
    }

    alert(text);
}

function setAdminPopup(id) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var index = loans.findIndex(function(item) {
        return String(item.id || "") === String(id || "");
    });

    if (index === -1) {
        alert("Application not found.");
        return;
    }

    var application = loans[index];
    var note = prompt(
        "Customer Status Popup Message\nThis message will appear when the customer enters this Application ID on the Status page after the latest message is saved to the shared backend.\nLeave empty to remove the message:",
        application.adminNote || application.statusPopup || ""
    );

    if (note === null) return;

    note = note.trim();
    application.adminNote = note;
    application.statusPopup = note;
    saveLoans(loans);

    syncToGoogleSheet("saveAdminNote", application)
        .then(function() {
            return fetchSharedApplicationById(application.id);
        })
        .then(function(serverApplication) {
            loadAdminApplications();
            var serverNote = serverApplication
                ? String(serverApplication.adminNote || serverApplication.statusPopup || "")
                : null;

            if (serverNote !== null && serverNote === note) {
                alert(note
                    ? "Customer popup message saved and verified in the shared backend."
                    : "Customer popup message removed and verified in the shared backend.");
            } else {
                alert(
                    "The message was updated on this device, but the shared backend did not confirm the same message.\n\n" +
                    "Please deploy the safe-patch Code.gs as a NEW version, then try again."
                );
            }
        })
        .catch(function(error) {
            console.warn("Popup save verification failed:", error);
            loadAdminApplications();
            alert(
                "The message was updated locally, but the backend could not be verified.\n\n" +
                "Check that the safe-patch Code.gs is deployed as a NEW version."
            );
        });
}

/* ================= ADMIN EMAIL ================= */

function getVDFTimeGreeting() {
    return getIndiaTimeGreeting().replace(/^\S+\s+/, "");
}

/* ================= EMAIL APPS SCRIPT ================= */
/* Email uses the same Apps Script Web App as Google Sheets. */
const VDF_EMAIL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw5DerC_6LCJMS5BRAYL5EoNnKYsCvYXj946wMY5wcieFVq8Ckm31rmS8_kt1jxjReUnQ/exec";

function sendVDFEmail(application, subject, message, silent, dedupeKey, clearanceInvoice, acknowledgementPdf, transactionStatement) {
    if (!application || !application.email) {
        if (!silent) alert("Customer email address is not available.");
        return Promise.resolve(false);
    }

    if (!VDF_EMAIL_WEB_APP_URL || VDF_EMAIL_WEB_APP_URL.indexOf("PASTE_EMAIL_APPS_SCRIPT") === 0) {
        if (!silent) alert("Email service URL is not configured yet.");
        console.warn("VDF email service URL is not configured.");
        return Promise.resolve(false);
    }

    var payload = {
        action: "sendEmail",
        to: application.email,
        subject: subject || "VD Finance - Application Update",
        message: message || "",
        dedupeKey: dedupeKey || "",
        clearanceInvoice: clearanceInvoice || null,
        acknowledgementPdf: acknowledgementPdf || null,
        transactionStatement: transactionStatement || null
    };

    return fetch(VDF_EMAIL_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).then(function() {
        if (!silent) alert("Email request sent to " + application.email + ".");
        return true;
    }).catch(function(error) {
        console.error("VDF email request failed:", error);
        if (!silent) alert("Email could not be sent. Please check the Email Apps Script deployment.");
        return false;
    });
}

function sendVDFLoanUpdateEmail(application, loan, loanIndex, record) {
    if (!application || !application.email || !loan || !record) return;
    var loanNumber = Number(loanIndex) + 1;
    var isPart = String(record.type || '').toLowerCase() === 'part payment';
    var greeting = getVDFTimeGreeting();
    var customerName = application.name || 'Customer';
    var subject = isPart ? ('VD Finance - Part Payment Updated - Loan ' + loanNumber) : ('VD Finance - Extension Confirmed - Loan ' + loanNumber);
    var message = greeting + ' ' + customerName + ',\n\n' +
        (isPart ? 'Your part payment has been recorded successfully.' : 'Your loan extension has been applied successfully.') + '\n\n' +
        'VD ID: ' + (application.id || '') + '\n' +
        'Loan Number: ' + loanNumber + '\n' +
        (isPart ? ('Amount Paid: ₹' + Number(record.paidNow||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\n') : '') +
        'Previous Payable: ₹' + Number(record.currentPayable||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\n' +
        (isPart ? ('Remaining Balance: ₹' + Number(record.balance||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\nNew Interest: ₹' + Number(record.newInterest||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\nPlatform Fee: ₹0\n') : ('Updated Interest: ₹' + Number(loan.interest||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\nPlatform Fee: ₹' + Number(loan.fee||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\n')) +
        'Current Total Payable: ₹' + Number(loan.total||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + '\n' +
        'Due Date: ' + (loan.repaymentDate || '') + '\n\nA current loan statement is attached with this email.\n\nRegards,\nVD Finance\nvdfinance3@gmail.com';
    var statement = {applicationId:application.id||'',customerName:customerName,loanNumber:loanNumber,updateType:isPart?'Part Payment':'Extension',updateDate:record.createdAt||new Date().toISOString(),loanAmount:Number(loan.amount||0),previousPayable:Number(record.currentPayable||0),amountPaid:Number(record.paidNow||0),balance:Number(record.balance||0),interest:Number(loan.interest||0),platformFee:Number(loan.fee||0),overdue:Number(loan.overdueFeeAccrued||0),discountPercent:Number(loan.discountPercent||0),discountAmount:Number(loan.discountAmount||0),totalPayable:Number(loan.total||0),dueDate:loan.repaymentDate||'',status:loan.status||'Active'};
    sendVDFEmail(application, subject, message, true, 'loanupdate|'+String(record.id||Date.now()), null, null, statement);
}

function sendApplicationReceivedEmail(application, loan) {
    if (!application || !application.email) return;

    var greeting = getVDFTimeGreeting();
    var customerName = application.name || "Customer";
    var amount = Number(loan && loan.amount || application.amount || 0);

    var history = ensureLoanHistory(application);
    var loanNumber = Number(loan && loan.loanNumber) || (history.indexOf(loan) + 1);
    if (loanNumber < 1) loanNumber = history.length || 1;

    var subject = "VD Finance - Application Received " + (application.id || "");
    var message =
        greeting + " " + customerName + ",\n\n" +
        "Thank you for choosing VD Finance.\n\n" +
        "Application ID: " + (application.id || "") + "\n" +
        "Loan Number: " + loanNumber + "\n" +
        "Applied Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
        "Status: Pending\n\n" +
        "Your loan application has been successfully received and is currently under review.\n\n" +
        "Regards,\nVD Finance\nvdfinance3@gmail.com";

    sendVDFEmail(application, subject, message, true, "", null, {
        customerName: customerName,
        applicationId: application.id || "",
        loanNumber: loanNumber,
        amount: amount,
        loanType: (Number(loan && loan.period || application.period || 30) < 30 ? "Day-wise Loan" : "Monthly Loan"),
        tenure: Number(loan && loan.period || application.period || 30),
        repaymentDate: (loan && loan.repaymentDate) || application.repaymentDate || "",
        acceptedAt: application.createdAt || new Date().toISOString()
    });
}

function sendExistingCustomerLoanEmail(application, loanIndex) {
    if (!application || !application.email) return;

    var history = ensureLoanHistory(application);
    var loan = history[loanIndex] || history[history.length - 1] || {};
    var loanNumber = Number(loanIndex) + 1;
    if (loanNumber < 1) loanNumber = history.length || 1;

    var greeting = getVDFTimeGreeting();
    var customerName = application.name || "Customer";
    var amount = Number(loan.amount || application.amount || 0);
    var total = Number(loan.total || application.total || 0);
    var loanDate = loan.createdAt || application.createdAt || "";

    function formatHistoricalDate(value) {
        if (!value) return "";
        var d = new Date(value);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        return String(value);
    }

    var subject = "VD Finance - Existing Loan Record";
    var message =
        greeting + " " + customerName + ",\n\n" +
        "This is a confirmation of your existing VD Finance loan record.\n\n" +
        "Application ID: " + (application.id || "") + "\n" +
        "Loan Number: " + loanNumber + "\n" +
        "Loan Taken Date: " + formatHistoricalDate(loanDate) + "\n" +
        "Loan Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
        "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
        "Due Date: " + formatHistoricalDate(loan.repaymentDate || application.repaymentDate) + "\n" +
        "Status: " + (loan.status || application.status || "") + "\n\n" +
        "Please keep this email for your records.\n\n" +
        "Regards,\nVD Finance\nvdfinance3@gmail.com";

    var emailDedupeKey = "existing|" + String(application.id || "") + "|loan" + String(loanNumber) + "|" + String(loanDate || "");
    sendVDFEmail(application, subject, message, true, emailDedupeKey);
}

function sendAutomaticStatusEmail(application, loanIndex, status) {
    if (!application || !application.email) return;

    var history = ensureLoanHistory(application);
    var loan = history[loanIndex] || history[history.length - 1] || {};
    var loanNumber = Number(loanIndex) + 1;
    if (loanNumber < 1) loanNumber = history.length || 1;
    var greeting = getVDFTimeGreeting();
    var customerName = application.name || "Customer";
    var amount = Number(loan.amount || 0);
    var total = Number(loan.total || 0);
    var subject;
    var message;

    if (String(status).toLowerCase() === "approved") {
        subject = "VD Finance - Loan Approved";
        message =
            greeting + " " + customerName + ",\n\n" +
            "Your VD Finance loan application has been approved.\n\n" +
            "Application ID: " + (application.id || "") + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Loan Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
            "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Due Date: " + (loan.repaymentDate || "") + "\n" +
            "Status: Approved\n\n" +
            "Please make the repayment on or before the due date.\n\n" +
            "Thank you for choosing VD Finance.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (String(status).toLowerCase() === "rejected") {
        subject = "VD Finance - Loan Application Update";
        message =
            greeting + " " + customerName + ",\n\n" +
            "Your VD Finance loan application has been reviewed.\n\n" +
            "Application ID: " + (application.id || "") + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Applied Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
            "Status: Rejected\n\n" +
            "Your application has not been approved at this time.\n\n" +
            "Thank you,\nVD Finance\nvdfinance3@gmail.com";
    } else if (String(status).toLowerCase() === "amount cleared" || String(status).toLowerCase() === "cleared") {
        subject = "VD Finance - Loan Cleared";
        message =
            greeting + " " + customerName + ",\n\n" +
            "Your loan repayment has been successfully cleared.\n\n" +
            "Application ID: " + (application.id || "") + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Loan Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
            "Amount Cleared: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Status: Amount Cleared\n\n" +
            "Thank you for choosing VD Finance.\n" +
            "We appreciate your trust in us.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else {
        subject = "VD Finance - Loan " + status;
        message =
            greeting + " " + customerName + ",\n\n" +
            "Application ID: " + (application.id || "") + "\n" +
            "Loan Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
            "Status: " + status + "\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    }

    var emailDedupeKey = "status|" + String(application.id || "") + "|loan" + String(loanNumber) + "|" + String(status || "").trim().toLowerCase();
    var clearedKey = String(status || "").toLowerCase();
    var clearanceInvoice = null;
    if (clearedKey === "amount cleared" || clearedKey === "cleared") {
        clearanceInvoice = {
            applicationId: application.id || "",
            customerName: customerName,
            loanNumber: loanNumber,
            loanAmount: amount,
            totalPaid: total,
            pendingAmount: 0,
            clearedDate: loan.clearedAt || new Date().toISOString(),
            repaymentDate: loan.repaymentDate || "",
            status: "AMOUNT CLEARED"
        };
    }
    sendVDFEmail(application, subject, message, true, emailDedupeKey, clearanceInvoice);
}

function sendAdminEmail(id) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var application = loans.find(function(item) {
        return String(item.id || "") === String(id || "");
    });

    if (!application) {
        alert("Application not found.");
        return;
    }
    if (!application.email) {
        alert("Customer email address is not available.");
        return;
    }

    var history = ensureLoanHistory(application);
    if (!history.length) {
        alert("No loan records found for this customer.");
        return;
    }

    /* Admin must explicitly choose which loan the email is for. This prevents
       Due Date / Overdue notices from accidentally using the latest loan. */
    var loanMenu = history.map(function(item, index) {
        var statusText = getLoanStatusDisplay(item.status || "Pending");
        var dueText = formatVdfDate(item.repaymentDate || getRepaymentDateFromCreatedAt(item.createdAt, item.period));
        return (index + 1) + " - Loan " + (index + 1) + " | " + statusText + " | Due: " + (dueText || "Not set");
    }).join("\n");
    var presetLoanNumber = Number(window.vdfPresetAdminMailLoan || 0);
    window.vdfPresetAdminMailLoan = 0;
    var loanChoice = presetLoanNumber >= 1 && presetLoanNumber <= history.length ? String(presetLoanNumber) : prompt(
        "Which loan do you want to send the email for?\n\n" + loanMenu + "\n\nEnter loan number:",
        String(history.length)
    );
    if (loanChoice === null) return;
    var loanNumber = parseInt(String(loanChoice).trim(), 10);
    if (!Number.isFinite(loanNumber) || loanNumber < 1 || loanNumber > history.length) {
        alert("Please enter a valid loan number from 1 to " + history.length + ".");
        return;
    }
    var loanIndex = loanNumber - 1;
    var loan = history[loanIndex] || application;
    var customerName = application.name || "Customer";
    /* Use this selected loan's own taken date + 30 days for due/overdue mail logic. */
    var dueDate = getVdLoanDueDateFromStart(loan, application);
    var dueRaw = dueDate || loan.repaymentDate || application.repaymentDate ||
        getRepaymentDateFromCreatedAt(loan.createdAt || application.createdAt);
    if (!dueDate) dueDate = parseVdfEmailDate(dueRaw);
    var dueDateText = dueDate ? dueDate.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    }) : String(dueRaw || "Not available");
    var amount = Number(loan.amount || application.amount || 0);
    var total = Number(loan.total || application.total || 0);

    var choice = prompt(
        "Choose an email template by number:\n\n" +
        "1 - Repayment reminder (5 days before due date)\n" +
        "2 - Due tomorrow reminder\n" +
        "3 - Payment due today\n" +
        "4 - Overdue payment notice\n" +
        "5 - Loan application status/update\n" +
        "6 - Custom email (type your own subject/message)\n\n" +
        "Enter 1-6:",
        "1"
    );
    if (choice === null) return;
    choice = String(choice).trim();

    var greeting = getVDFTimeGreeting();
    var subject = "";
    var message = "";
    var daysOverdue = 0;

    if (choice === "1") {
        subject = "VD Finance - Repayment Reminder: 5 Days Remaining";
        message = greeting + " " + customerName + ",\n\n" +
            "This is a friendly repayment reminder from VD Finance.\n\n" +
            "Application ID: " + application.id + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Repayment Due Date: " + dueDateText + "\n\n" +
            "Your repayment is due in 5 days. Please make the payment on or before the due date.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (choice === "2") {
        subject = "VD Finance - Repayment Due Tomorrow";
        message = greeting + " " + customerName + ",\n\n" +
            "Your VD Finance repayment is due tomorrow.\n\n" +
            "Application ID: " + application.id + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Repayment Due Date: " + dueDateText + "\n\n" +
            "Please complete the payment by the due date.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (choice === "3") {
        subject = "VD Finance - Payment Due Today";
        message = greeting + " " + customerName + ",\n\n" +
            "This is a reminder that your VD Finance repayment is due today.\n\n" +
            "Application ID: " + application.id + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Repayment Due Date: " + dueDateText + "\n\n" +
            "Please complete the payment today.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (choice === "4") {
        if (dueDate) {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            var overdueDiff = Math.floor((today.getTime() - dueDay.getTime()) / 86400000);
            if (overdueDiff <= 0) {
                alert("Loan " + loanNumber + " is not overdue yet. Overdue mail can be sent only after the selected loan period is completed. Due: " + dueDateText);
                return;
            } else {
                daysOverdue = overdueDiff;
            }
        }
        var overdueAccrued = Number(loan.overdueFeeAccrued || 0);
        var lateRate = Number(loan.period) > 0 && Number(loan.period) < 30 ? 40 : 79;
        var overdueCharge = Math.max(overdueAccrued, daysOverdue * lateRate);
        var overduePayable = total + overdueCharge;
        subject = "VD Finance - Repayment Overdue Notice";
        message = greeting + " " + customerName + ",\n\n" +
            "Our records indicate that your VD Finance repayment is overdue.\n\n" +
            "Application ID: " + application.id + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Total Payable: ₹" + overduePayable.toLocaleString("en-IN") + "\n" +
            "Repayment Due Date: " + dueDateText + "\n" +
            (daysOverdue ? "Days Overdue: " + daysOverdue + "\n" : "") +
            "\nPlease contact VD Finance if you have already paid or need to discuss your repayment.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (choice === "5") {
        subject = "VD Finance - Loan Application Update";
        message = greeting + " " + customerName + ",\n\n" +
            "Application ID: " + application.id + "\n" +
            "Loan Number: " + loanNumber + "\n" +
            "Loan Amount: ₹" + amount.toLocaleString("en-IN") + "\n" +
            "Total Payable: ₹" + total.toLocaleString("en-IN") + "\n" +
            "Current Status: " + (loan.status || application.status || "Pending") + "\n" +
            "Repayment Due Date: " + dueDateText + "\n\n" +
            "For any questions, please contact VD Finance.\n\n" +
            "Regards,\nVD Finance\nvdfinance3@gmail.com";
    } else if (choice === "6") {
        subject = prompt("Email Subject:", "VD Finance - Application " + application.id);
        if (subject === null) return;
        message = prompt("Message to customer:", greeting + " " + customerName + ",\n\nRegards,\nVD Finance");
        if (message === null) return;
    } else {
        alert("Please enter a number from 1 to 6.");
        return;
    }

    if (!confirm("Send this email template to " + application.email + "?\n\nSubject: " + subject + "\n\n" + message)) {
        return;
    }
    sendVDFEmail(application, subject, message, false);
}

function parseVdfEmailDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    var text = String(value).trim();
    var match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        var isoDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return isNaN(isoDate.getTime()) ? null : isoDate;
    }
    var d = new Date(text);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}


/* ================= SEPARATE DISCOUNT CALCULATOR ================= */
function openVdDiscountCalculator() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var loans = getLoans();
    if (!loans.length) { alert("No customer data is available."); return; }
    var old = document.getElementById("vdDiscountCalculatorOverlay");
    if (old) old.remove();

    var overlay = document.createElement("div");
    overlay.id = "vdDiscountCalculatorOverlay";
    overlay.className = "vd-disc-overlay";
    overlay.innerHTML = `
      <div class="vd-disc-box" role="dialog" aria-modal="true" aria-label="Discount Calculator">
        <div class="vd-disc-head"><div><h2>🏷️ Discount Calculator</h2><p>Discount is calculated only from the selected loan's latest current payable.</p></div><button class="vd-disc-close" type="button" onclick="closeVdDiscountCalculator()">×</button></div>
        <div class="vd-disc-grid">
          <div class="vd-disc-field"><label>Customer</label><select id="vdDiscCustomer"></select></div>
          <div class="vd-disc-field"><label>Loan</label><select id="vdDiscLoan"></select></div>
        </div>
        <div class="vd-disc-field" style="margin-top:13px"><label>Discount Percentage</label><input id="vdDiscPercent" type="number" min="0" max="100" step="0.1" value="0" inputmode="decimal"></div>
        <div class="vd-disc-quick"><button type="button" onclick="setVdDiscountPercent(1)">1%</button><button type="button" onclick="setVdDiscountPercent(2)">2%</button><button type="button" onclick="setVdDiscountPercent(3)">3%</button><button type="button" onclick="setVdDiscountPercent(5)">5%</button><button type="button" onclick="setVdDiscountPercent(10)">10%</button><button type="button" onclick="setVdDiscountPercent(0)">Clear</button></div>
        <div class="vd-disc-preview">
          <div class="vd-disc-row"><span>Principal / Loan Amount</span><strong id="vdDiscPrincipal">₹0</strong></div>
          <div class="vd-disc-row"><span>Current Payable Before Discount</span><strong id="vdDiscOriginal">₹0</strong></div>
          <div class="vd-disc-row"><span>Discount Amount</span><strong id="vdDiscAmount">− ₹0</strong></div>
          <div class="vd-disc-row final"><span>Customer Final Payable</span><strong id="vdDiscFinal">₹0</strong></div>
        </div>
        <div class="vd-disc-note">Latest Extension / Part Payment / Overdue state is used. Old original payable is never restored while applying a discount.</div>
        <div class="vd-disc-actions"><button type="button" class="vd-disc-cancel" onclick="closeVdDiscountCalculator()">Cancel</button><button type="button" class="vd-disc-cancel" id="vdDiscRemoveBtn" onclick="removeVdDiscount()" style="display:none;">🗑 Remove Discount</button><button type="button" class="vd-disc-apply" id="vdDiscApplyBtn" onclick="applyVdDiscountFromCalculator()">Apply Discount</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function(e){ if(e.target===overlay) closeVdDiscountCalculator(); });

    var customer = document.getElementById("vdDiscCustomer");
    loans.forEach(function(app){
        var opt=document.createElement("option"); opt.value=app.id; opt.textContent=(app.name||"Customer")+" — "+(app.id||""); customer.appendChild(opt);
    });
    customer.addEventListener("change", populateVdDiscountLoans);
    document.getElementById("vdDiscLoan").addEventListener("change", loadVdDiscountPreview);
    document.getElementById("vdDiscPercent").addEventListener("input", loadVdDiscountPreview);
    populateVdDiscountLoans();
}
function closeVdDiscountCalculator(){ var x=document.getElementById("vdDiscountCalculatorOverlay"); if(x)x.remove(); }
function vdDiscMoney(v){ return "₹"+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2}); }
function getVdDiscountSelection(){
    var apps=getLoans(), cid=document.getElementById("vdDiscCustomer")?.value, li=Number(document.getElementById("vdDiscLoan")?.value);
    var app=apps.find(function(a){return a.id===cid;}); if(!app)return null;
    var hist=ensureLoanHistory(app), loan=hist[li]; if(!loan)return null;
    return {apps:apps,app:app,hist:hist,loan:loan,index:li};
}
function populateVdDiscountLoans(){
    var apps=getLoans(), cid=document.getElementById("vdDiscCustomer")?.value, app=apps.find(function(a){return a.id===cid;});
    var sel=document.getElementById("vdDiscLoan"); if(!sel)return; sel.innerHTML="";
    if(!app)return;
    ensureLoanHistory(app).forEach(function(loan,i){ var o=document.createElement("option");o.value=i;o.textContent="Loan "+(i+1)+" — "+(loan.status||"Pending");sel.appendChild(o); });
    loadVdDiscountPreview();
}
function getVdDiscountBaseTotal(loan){
    loan=loan||{};
    /* Discount must always use the LATEST loan state, never an old/original total.
       Part Payment: remaining balance + new interest + current overdue (platform fee = 0).
       Extension/normal: current principal + current interest + current platform fee + overdue.
       A saved discountBaseTotal is only a snapshot for audit/display; it is NOT used as the
       source for a later discount update because the loan may have changed after it was saved. */
    var statusKey=String(loan.status||'').trim().toLowerCase();
    if(statusKey==='amount cleared'||statusKey==='amount-cleared'||statusKey==='cleared'||statusKey==='paid') return 0;
    var live=(typeof getLoanOverdueInfo==='function')?getLoanOverdueInfo(loan):{fee:0};
    var savedCurrent=Math.max(0,Number(loan.overdueFeeCurrentPeriod||0));
    var savedAccrued=Math.max(0,Number(loan.overdueFeeAccrued||0));
    var liveCurrent=Math.max(savedCurrent,Math.max(0,Number(live&&live.fee||0)));
    var overdue=(loan.manualOverdueEdited===true)
      ? Math.max(0,Number(loan.manualOverdueCharges||0))
      : Math.max(0,savedAccrued-savedCurrent)+liveCurrent;
    var updates=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];
    var last=updates.length?updates[updates.length-1]:null;
    var type=String(last&&last.type||'').toLowerCase();
    var isPart=Number(loan.amountPaid||0)>0||type==='part'||type==='part payment';
    var base=isPart
      ? Math.max(0,Number(loan.remainingAmount||0))+Math.max(0,Number(loan.adjustedInterest||0))+overdue
      : Math.max(0,Number(loan.amount||0))+Math.max(0,Number(loan.interest||0))+Math.max(0,Number(loan.fee||0))+overdue;
    return Number(Math.max(0,base).toFixed(2));
}
function setVdDiscountPercent(v){ var i=document.getElementById("vdDiscPercent");if(i){i.value=v;loadVdDiscountPreview();} }
function loadVdDiscountPreview(){
    var x=getVdDiscountSelection(); if(!x)return;
    var input=document.getElementById("vdDiscPercent");
    if(input && input.dataset.loanKey !== String(x.app.id)+"::"+String(x.index)){ input.value=Number(x.loan.discountPercent||0); input.dataset.loanKey=String(x.app.id)+"::"+String(x.index); }
    var pct=Math.max(0,Math.min(100,Number(input?.value||0)));
    var hasDiscount=vdfHasSavedLoanDiscount(x.loan);
    var removeBtn=document.getElementById("vdDiscRemoveBtn"), applyBtn=document.getElementById("vdDiscApplyBtn");
    if(removeBtn) removeBtn.style.display=hasDiscount?"inline-flex":"none";
    if(applyBtn) applyBtn.textContent=hasDiscount?"✏️ Update Discount":"Apply Discount";
    var principal=Math.max(0,Number(x.loan.amount||0)), base=getVdDiscountBaseTotal(x.loan), disc=Number((base*pct/100).toFixed(2)), final=Number(Math.max(0,base-disc).toFixed(2));
    document.getElementById("vdDiscPrincipal").textContent=vdDiscMoney(principal);
    document.getElementById("vdDiscOriginal").textContent=vdDiscMoney(base);
    document.getElementById("vdDiscAmount").textContent="− "+vdDiscMoney(disc);
    document.getElementById("vdDiscFinal").textContent=vdDiscMoney(final);
}
function applyVdDiscountFromCalculator(){
    var x=getVdDiscountSelection(); if(!x)return;
    var pct=Number(document.getElementById("vdDiscPercent")?.value||0);
    if(!Number.isFinite(pct)||pct<0||pct>100){alert("Discount must be between 0% and 100%.");return;}
    var base=getVdDiscountBaseTotal(x.loan), disc=Number((base*pct/100).toFixed(2)), final=Number(Math.max(0,base-disc).toFixed(2));
    var msg="Apply "+pct+"% discount to Loan "+(x.index+1)+"?\n\nLatest payable before discount: "+vdDiscMoney(base)+"\nDiscount: "+vdDiscMoney(disc)+"\nFinal payable: "+vdDiscMoney(final)+"\n\nThis will update only the selected loan's latest payable amount.";
    if(!confirm(msg))return;
    /* Never overwrite/restore the loan from an old total when applying a discount. */
    x.loan.discountBaseTotal=base;
    x.loan.discountApplied=true;
    x.loan.discountPercent=pct;
    x.loan.discountAmount=disc;
    x.loan.discountUpdatedAt=new Date().toISOString();
    x.loan.total=final;
    x.hist[x.index]=x.loan; x.app.loanHistory=x.hist;
    var latest=x.hist[x.hist.length-1]; x.app.amount=latest.amount;x.app.period=latest.period;x.app.interest=latest.interest;x.app.fee=latest.fee;x.app.total=latest.total;x.app.repaymentDate=latest.repaymentDate;x.app.status=latest.status;
    saveLoans(x.apps); syncToGoogleSheet("update",x.app); loadAdminApplications(); loadVdDiscountPreview();
    var openStatusId=document.getElementById("statusId");
    if(openStatusId && String(openStatusId.value||"").trim().toUpperCase()===String(x.app.id||"").trim().toUpperCase()){ renderStatusFromLocal(); }
    alert("Discount applied successfully to Loan "+(x.index+1)+".\nFinal payable: "+vdDiscMoney(final));
}
function removeVdDiscount(){
    var x=getVdDiscountSelection(); if(!x)return;
    var hasDiscount=vdfHasSavedLoanDiscount(x.loan);
    if(!hasDiscount){alert("No discount is applied to this loan.");return;}
    if(!confirm("Remove the discount from Loan "+(x.index+1)+"?\n\nTotal Payable will return to the amount before discount."))return;
    var base=getVdDiscountBaseTotal(x.loan);
    /* Restore the LATEST pre-discount payable, not an old/original payable. */
    x.loan.total=Number(base.toFixed(2));
    x.loan.discountApplied=false; x.loan.discountPercent=0; x.loan.discountAmount=0;
    x.loan.discountUpdatedAt=new Date().toISOString();
    delete x.loan.discountBaseTotal;
    x.hist[x.index]=x.loan; x.app.loanHistory=x.hist;
    var latest=x.hist[x.hist.length-1]; x.app.amount=latest.amount;x.app.period=latest.period;x.app.interest=latest.interest;x.app.fee=latest.fee;x.app.total=latest.total;x.app.repaymentDate=latest.repaymentDate;x.app.status=latest.status;
    saveLoans(x.apps); syncToGoogleSheet("update",x.app); loadAdminApplications();
    var openStatusId=document.getElementById("statusId");
    if(openStatusId && String(openStatusId.value||"").trim().toUpperCase()===String(x.app.id||"").trim().toUpperCase()){ renderStatusFromLocal(); }
    var input=document.getElementById("vdDiscPercent"); if(input){input.value=0;input.dataset.loanKey="";} loadVdDiscountPreview();
    alert("Discount removed from Loan "+(x.index+1)+".");
}

/* ================= EDIT APPLICATION ================= */

function editCustomerFromTopDashboard() {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();

    if (!loans.length) {
        alert("No customer data is available to edit.");
        return;
    }

    var availableIds = loans.map(function(item) {
        return item.id;
    }).filter(Boolean).join(", ");

    chooseApplicationIdForAdmin("Edit Full Access", function(applicationId) {
        showEditFullAccessChoice(applicationId);
    });
}

/* Edit Full Access first asks what kind of update Admin wants. */
function showEditFullAccessChoice(id) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id) === String(id); });
    if (!application) { alert("Customer not found."); return; }
    var old = document.getElementById("vdfEditAccessChoice");
    if (old) old.remove();
    var modal = document.createElement("div");
    modal.id = "vdfEditAccessChoice";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.76);display:flex;align-items:center;justify-content:center;z-index:2147483500;padding:16px;";
    modal.innerHTML = '<div style="width:min(520px,100%);background:#10151d;border:1px solid #3b414c;border-radius:18px;padding:20px;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.55)">' +
      '<h2 style="margin:0 0 6px;color:#e8bd55;">Edit Full Access</h2>' +
      '<p style="margin:0 0 18px;color:#bfc5cf;">'+escapeHTML(application.name||'Customer')+' • '+escapeHTML(application.id||'')+'<br><small>Select what you want to update.</small></p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<button type="button" id="vdfChooseEditLoan" class="btn btn-primary" style="min-height:74px;">✏️ Edit Loan<br><small>Amount, dates, period, interest, fee, total & status</small></button>' +
        '<button type="button" id="vdfChooseExtension" class="btn btn-primary" style="min-height:74px;">🔄 Extension / Part Payment<br><small>Paid amount, balance, new due date & auto interest</small></button>' +
      '</div>' +
      '<button type="button" class="btn btn-danger" style="margin-top:14px;width:100%;" onclick="document.getElementById(\'vdfEditAccessChoice\').remove()">Close</button>' +
    '</div>';
    modal.addEventListener("click", function(e){ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
    var chooseEdit = modal.querySelector("#vdfChooseEditLoan");
    var chooseExt = modal.querySelector("#vdfChooseExtension");
    if (chooseEdit) chooseEdit.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); modal.remove(); setTimeout(function(){ showCustomerLoanEditor(id, "edit"); }, 0); });
    if (chooseExt) chooseExt.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); modal.remove(); setTimeout(function(){ showCustomerLoanEditor(id, "extension"); }, 0); });
}

/* Calculate overdue days from the day after the due date. The backend daily trigger
   persists ₹40/day for day-wise loans and ₹79/day for monthly loans into the saved loan total; this helper is a fallback estimate
   for the admin extension flow if today's fee has not yet been persisted. */
function getLoanOverdueInfo(loan) {
    loan = loan || {};
    var statusKey = String(loan.status || "").trim().toLowerCase();
    /* A cleared/paid loan is financially closed. Never create fresh overdue
       days or charges after the cleared date. Historical values remain stored. */
    if (statusKey === "amount cleared" || statusKey === "amount-cleared" || statusKey === "cleared" || statusKey === "paid") {
        return { days: 0, fee: 0 };
    }
    /* Edit Full Access can intentionally override the live overdue values for
       this exact loan only. */
    if (loan.manualOverdueEdited === true) {
        return {
            days: Math.max(0, Number(loan.manualOverdueDays || 0)),
            fee: Math.max(0, Number(loan.manualOverdueCharges || 0))
        };
    }
    var dateText = String((loan && loan.repaymentDate) || "").trim();
    var dueDate = null;
    var dm = dateText.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    var iso = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dm) dueDate = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
    else if (iso) dueDate = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else if (dateText) dueDate = parseVdfEmailDate(dateText);
    if (!dueDate || isNaN(dueDate.getTime())) return { days: 0, fee: 0 };
    dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var days = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
    var dailyRate = Number(loan && loan.period) > 0 && Number(loan.period) < 30 ? 40 : 79;
    return { days: days, fee: days * dailyRate };
}

/* After selecting a customer, show each existing loan separately so the admin
   can edit Loan 1, Loan 2, Loan 3, etc. without accidentally creating a loan. */
function showCustomerLoanEditor(id, mode) {
    mode = mode === "extension" ? "extension" : "edit";
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id) === String(id); });
    if (!application) {
        alert("Customer not found.");
        return;
    }

    var history = ensureLoanHistory(application);
    var oldModal = document.getElementById("vdfCustomerLoanEditor");
    if (oldModal) oldModal.remove();

    var modal = document.createElement("div");
    modal.id = "vdfCustomerLoanEditor";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:2147483501;padding:16px;overflow:auto;";

    var box = document.createElement("div");
    box.style.cssText = "width:min(760px,100%);max-height:90vh;overflow:auto;background:#10151d;color:#f7f7f7;border:1px solid #b88b2e;border-radius:16px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.4);";

    var header = document.createElement("div");
    header.innerHTML = '<h2 style="margin:0 0 6px;color:#e8bd55;">' + (mode === "extension" ? "Extension / Part Payment" : "Edit Loan") + '</h2><div style="margin-bottom:16px;color:#c8cbd0;">Customer: <b>' + escapeHTML(application.name || "") + '</b> &nbsp; | &nbsp; ID: ' + escapeHTML(application.id || "") + '<br><small>' + (mode === "extension" ? "Select a loan to update paid amount, balance and due date." : "Select a loan to correct its full loan details.") + '</small></div>';
    box.appendChild(header);

    history.forEach(function(loan, loanIndex) {
        var card = document.createElement("div");
        card.style.cssText = "display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;border:1px solid #343b46;border-radius:12px;padding:12px;margin:10px 0;background:#171e28;";
        var details = document.createElement("div");
        var overdueInfo = getLoanOverdueInfo(loan);
        var accruedLateFee = Math.max(0, Number(loan.overdueFeeAccrued || 0));
        details.innerHTML = '<b style="color:#e8bd55;">Loan ' + (loanIndex + 1) + '</b><br><span style="font-size:13px;color:#d0d4da;">Amount: ' + escapeHTML(money(loan.amount)) + ' &nbsp; | &nbsp; Status: ' + escapeHTML(loan.status || "Pending") + '<br>Payable: ' + escapeHTML(money(Math.max(0,(Number(loan.total)||0)-Math.max(0,Number(loan.overdueFeeCurrentPeriod||0))+getLoanOverdueInfo(loan).fee))) + ((loan.discountApplied===true && (Number(loan.discountPercent)||0) > 0) ? (' &nbsp; | &nbsp; <span style="color:#86efac;font-weight:800;">Discount: ' + escapeHTML(String(Number(loan.discountPercent))) + '%</span>') : '') + '<br>Due: ' + escapeHTML(formatAdminRepaymentDate(loan.repaymentDate || "")) + '</span>' +
            '<br><span style="font-size:13px;color:' + (overdueInfo.days ? '#ff8585' : '#9bd6a8') + ';">' +
            (overdueInfo.days ? ('Overdue: ' + overdueInfo.days + ' day(s) | Current late fee: ' + escapeHTML(money(overdueInfo.fee)) + ' (₹' + (Number(loan.period) > 0 && Number(loan.period) < 30 ? 40 : 79) + '/day)') : 'No current overdue fee') +
            (accruedLateFee ? ('<br>Previously added late fees: ' + escapeHTML(money(accruedLateFee))) : '') + '</span>';
        var actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;";
        var editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = mode === "extension" ? "btn-success" : "btn-primary";
        editButton.textContent = mode === "extension" ? ("Extension / Part Payment — Loan " + (loanIndex + 1)) : ("Edit Loan " + (loanIndex + 1));
        editButton.onclick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            modal.remove();
            if (mode === "extension") extensionPartPaymentTransaction(id, loanIndex);
            else editLoanDetailsTransaction(id, loanIndex);
        };
        actions.appendChild(editButton);
        if (mode === "edit") {
            var deleteLoanButton = document.createElement("button");
            deleteLoanButton.type = "button";
            deleteLoanButton.className = "btn-danger";
            deleteLoanButton.textContent = "🗑 Delete Loan " + (loanIndex + 1);
            deleteLoanButton.onclick = function(e) {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                modal.remove();
                setTimeout(function(){ deleteLoanTransaction(id, loanIndex); }, 0);
            };
            actions.appendChild(deleteLoanButton);
        }
        if (mode === "extension") {
            var extendButton = document.createElement("button");
            extendButton.type = "button";
            extendButton.className = "btn-success";
            extendButton.textContent = "Quick +1 Month";
            extendButton.title = "Add one month of interest and extend this existing loan's due date by one month";
            extendButton.onclick = function(e) { if(e){e.preventDefault();e.stopPropagation();} extendExistingLoanOneMonth(id, loanIndex); };
            actions.appendChild(extendButton);
            var updateHistory = Array.isArray(loan.balanceUpdateHistory) ? loan.balanceUpdateHistory : [];
            if (updateHistory.length) {
                var editUpdateButton=document.createElement("button");editUpdateButton.type="button";editUpdateButton.className="btn-primary";editUpdateButton.textContent="✏️ Edit Latest Update";editUpdateButton.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}modal.remove();setTimeout(function(){editLatestLoanBalanceUpdate(id,loanIndex);},0);};actions.appendChild(editUpdateButton);
                var deleteUpdateButton=document.createElement("button");deleteUpdateButton.type="button";deleteUpdateButton.className="btn-danger";deleteUpdateButton.textContent="🗑 Delete Latest Update";deleteUpdateButton.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}modal.remove();setTimeout(function(){deleteLatestLoanBalanceUpdate(id,loanIndex);},0);};actions.appendChild(deleteUpdateButton);
            }
        }
        card.appendChild(details);
        card.appendChild(actions);
        box.appendChild(card);
    });

    var customerButton = document.createElement("button");
    customerButton.type = "button";
    customerButton.className = "btn-success";
    customerButton.style.cssText = "margin-top:12px;margin-right:8px;";
    customerButton.textContent = mode === "edit" ? "Edit Customer Details" : "← Back";
    customerButton.onclick = function(e) { if(e){e.preventDefault();e.stopPropagation();} modal.remove(); setTimeout(function(){ if (mode === "edit") editCustomerDetailsOnly(id); else showEditFullAccessChoice(id); },0); };
    box.appendChild(customerButton);

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-danger";
    closeButton.style.marginTop = "12px";
    closeButton.textContent = "Close";
    closeButton.onclick = function(e) { if(e){e.preventDefault();e.stopPropagation();} modal.remove(); };
    box.appendChild(closeButton);

    modal.appendChild(box);
    modal.addEventListener("click", function(event) {
        if (event.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

/* Extend an existing loan by one month without creating a new loan.
   Adds one month of interest, advances the due date, and syncs the updated
   existing loan record to the backend. Existing reminder functions/triggers
   are intentionally not changed by this feature. */
function extendExistingLoanOneMonth(id, loanIndex) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }
    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id) === String(id); });
    if (!application) { alert("Customer not found."); return; }
    var history = ensureLoanHistory(application);
    var loan = history[loanIndex];
    if (!loan) { alert("Loan not found."); return; }
    if (String(loan.status || "").toLowerCase() === "amount cleared") {
        alert("This loan is marked Amount Cleared. Reopen/edit its status before extending it.");
        return;
    }

    var currentInterest = Number(loan.interest || 0);
    var currentPeriod = Math.max(1, Number(loan.period || 30));
    var monthsAlready = Math.max(1, Math.ceil(currentPeriod / 30));
    var monthlyInterest = Number(loan.monthlyInterest);
    if (!Number.isFinite(monthlyInterest) || monthlyInterest < 0) {
        monthlyInterest = currentInterest / monthsAlready;
    }
    var currentFee = Number(loan.fee || 0);
    var currentTotal = Number(loan.total);
    if (!Number.isFinite(currentTotal) || currentTotal <= 0) {
        currentTotal = Number(loan.amount || 0) + currentInterest + currentFee;
    }
    var overdueInfoAtExtension = getLoanOverdueInfo(loan);
    // Daily backend accrual is already included in loan.total. Add only any fee
    // for overdue days that the daily trigger has not yet persisted.
    var previouslyAccruedCurrentPeriod = Math.max(0, Number(loan.overdueFeeCurrentPeriod || 0));
    var lateFeeThisPeriod = Math.max(0, overdueInfoAtExtension.fee - previouslyAccruedCurrentPeriod);
    var previouslyAccruedLateFee = Math.max(0, Number(loan.overdueFeeAccrued || 0));

    var dateText = String(loan.repaymentDate || "").trim();
    var dueDate = null;
    var dm = dateText.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    var iso = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dm) dueDate = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
    else if (iso) dueDate = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else dueDate = parseVdfEmailDate(dateText);
    if (!dueDate || isNaN(dueDate.getTime())) {
        alert("Could not read the current repayment date. Please use Edit Loan to set a valid date first.");
        return;
    }
    var oldDueText = loan.repaymentDate || "";
    var newDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate());
    // Clamp dates such as 31 Jan to the last valid day of the next month.
    if (newDueDate.getDate() !== dueDate.getDate()) newDueDate.setDate(0);
    var newDueText = String(newDueDate.getDate()).padStart(2, "0") + "/" + String(newDueDate.getMonth() + 1).padStart(2, "0") + "/" + newDueDate.getFullYear();
    var extraInterest = Math.round(monthlyInterest * 100) / 100;
    var newInterest = Math.round((currentInterest + extraInterest) * 100) / 100;
    var newTotal = Math.round((currentTotal + extraInterest + lateFeeThisPeriod) * 100) / 100;
    var newAccruedLateFee = Math.round((previouslyAccruedLateFee + lateFeeThisPeriod) * 100) / 100;

    var confirmation = "Extend existing Loan " + (loanIndex + 1) + " by 1 month?\n\n" +
        "Current due date: " + oldDueText + "\nNew due date: " + newDueText + "\n" +
        "Extra 1-month interest: ₹" + extraInterest.toFixed(2) + "\n" +
        "Overdue days before extension: " + overdueInfoAtExtension.days + "\n" +
        "Late fee added (₹" + (Number(loan.period) > 0 && Number(loan.period) < 30 ? 40 : 79) + "/day): ₹" + lateFeeThisPeriod.toFixed(2) + "\n" +
        "Updated total interest: ₹" + newInterest.toFixed(2) + "\n" +
        "Updated total payable (including late fee): ₹" + newTotal.toFixed(2) + "\n\n" +
        "This updates the existing loan; it does not create a new loan.";
    if (!confirm(confirmation)) return;

    loan.monthlyInterest = monthlyInterest;
    loan.overdueFeeAccrued = Math.round((previouslyAccruedLateFee + lateFeeThisPeriod) * 100) / 100;
    loan.overdueFeeCurrentPeriod = 0;
    loan.lastOverdueFeeDate = "";
    loan.extensionCount = Math.max(0, Number(loan.extensionCount || 0)) + 1;
    loan.extensionHistory = Array.isArray(loan.extensionHistory) ? loan.extensionHistory : [];
    loan.extensionHistory.push({
        extendedAt: new Date().toISOString(),
        oldDueDate: oldDueText,
        newDueDate: newDueText,
        extraInterest: extraInterest,
        overdueDaysAtExtension: overdueInfoAtExtension.days,
        lateFeeAdded: lateFeeThisPeriod,
        totalLateFeeAccrued: newAccruedLateFee,
        totalInterestAfterExtension: newInterest,
        totalPayableAfterExtension: newTotal
    });
    loan.period = currentPeriod + 30;
    loan.repaymentDate = newDueText;
    loan.interest = newInterest;
    loan.total = newTotal;
    history[loanIndex] = loan;
    application.loanHistory = history;

    // Keep top-level fields aligned with the latest loan for existing status views.
    var latest = history[history.length - 1];
    application.amount = latest.amount;
    application.period = latest.period;
    application.interest = latest.interest;
    application.fee = latest.fee;
    application.total = latest.total;
    application.repaymentDate = latest.repaymentDate;
    application.status = latest.status;
    application.userAccess = history.some(function(item) { return item.status !== "Amount Cleared"; });

    saveLoans(loans);
    syncToGoogleSheet("update", application);
    loadAdminApplications();
    showCustomerLoanEditor(id);
    alert("Loan " + (loanIndex + 1) + " extended by one month. Extra interest: ₹" + extraInterest.toFixed(2) + "; overdue late fee added: ₹" + lateFeeThisPeriod.toFixed(2) + ".");
}

function editLoanDetailsTransaction(id, loanIndex) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var apps=getLoans(), app=apps.find(function(x){return String(x.id)===String(id);});
    if(!app){alert("Customer not found.");return;}
    var hist=ensureLoanHistory(app), loan=hist[loanIndex]; if(!loan){alert("Loan not found.");return;}
    var old=document.getElementById("vdfLoanFullPageEditor"); if(old)old.remove();
    var created=vdfDateForInput(loan.createdAt||app.createdAt||"");
    var due=vdfDateForInput(loan.repaymentDate||"");
    var overlay=document.createElement("div"); overlay.id="vdfLoanFullPageEditor"; overlay.className="vdf-loan-page-overlay";
    overlay.innerHTML='<div class="vdf-loan-page">'+
      '<div class="vdf-loan-page-head"><div><button type="button" class="vdf-page-back" onclick="document.getElementById(\'vdfLoanFullPageEditor\').remove();showCustomerLoanEditor(\''+String(id).replace(/'/g,"\\'")+'\',\'edit\')">← Back</button><h2>Edit Loan '+(loanIndex+1)+'</h2><p>'+escapeHTML(app.name||'Customer')+' • '+escapeHTML(app.id||'')+'</p></div><button type="button" class="vdf-page-close" onclick="document.getElementById(\'vdfLoanFullPageEditor\').remove()">✕</button></div>'+
      '<div class="vdf-loan-page-grid">'+
      '<label>Loan Amount<input id="vdfEditLoanAmount" type="number" min="100" max="50000" value="'+Number(loan.amount||0)+'"></label>'+
      '<label>Loan Taken / Application Date<input id="vdfEditLoanCreated" type="date" value="'+escapeHTML(created)+'"></label>'+
      '<label>Period (Days)<input id="vdfEditLoanPeriod" type="number" min="1" value="'+Number(loan.period||30)+'"></label>'+
      '<label>Due / Repayment Date<input id="vdfEditLoanDue" type="date" value="'+escapeHTML(due)+'"></label>'+
      '<label>Interest<input id="vdfEditLoanInterest" type="number" min="0" step="0.01" value="'+Number(loan.interest||0)+'"></label>'+
      '<label>Platform Fee<input id="vdfEditLoanFee" type="number" min="0" step="0.01" value="'+Number(loan.fee==null?100:loan.fee)+'"></label>'+
      '<label>Total Payable Before Discount<input id="vdfEditLoanTotal" type="number" min="0" step="0.01" value="'+Number(vdfHasSavedLoanDiscount(loan)?getVdDiscountBaseTotal(loan):(loan.total||0))+'"></label>'+
      '<label>Overdue Days<input id="vdfEditLoanOverdueDays" type="number" min="0" step="1" value="'+Math.max(0,Number((loan.manualOverdueEdited===true?loan.manualOverdueDays:getLoanOverdueInfo(loan).days)||0))+'"></label>'+
      '<label>Overdue Charges<input id="vdfEditLoanOverdueCharges" type="number" min="0" step="0.01" value="'+Math.max(0,Number((loan.manualOverdueEdited===true?loan.manualOverdueCharges:getLoanOverdueInfo(loan).fee)||0))+'"></label>'+
      '<label>Status<select id="vdfEditLoanStatus"><option>Pending</option><option>Approved</option><option>Rejected</option><option>Amount Cleared</option></select></label>'+
      '</div><div class="vdf-loan-page-note">This edits the selected existing loan only. It will not create or overwrite another Loan 1 / Loan 2 / Loan 3 record.</div>'+
      '<div class="vdf-loan-page-actions"><button type="button" onclick="document.getElementById(\'vdfLoanFullPageEditor\').remove();showCustomerLoanEditor(\''+String(id).replace(/'/g,"\\'")+'\',\'edit\')">Cancel</button><button type="button" class="save" onclick="saveFullPageLoanEdit(\''+String(id).replace(/'/g,"\\'")+'\','+loanIndex+')">Save Loan Changes</button></div></div>';
    document.body.appendChild(overlay);
    document.getElementById("vdfEditLoanStatus").value=loan.status||"Pending";
}
function saveFullPageLoanEdit(id,loanIndex){
    var apps=getLoans(),app=apps.find(function(x){return String(x.id)===String(id);});if(!app)return;
    var hist=ensureLoanHistory(app),loan=hist[loanIndex];if(!loan)return;
    var amount=Number(document.getElementById("vdfEditLoanAmount").value),period=Number(document.getElementById("vdfEditLoanPeriod").value),interest=Number(document.getElementById("vdfEditLoanInterest").value),fee=Number(document.getElementById("vdfEditLoanFee").value),baseTotal=Number(document.getElementById("vdfEditLoanTotal").value),overdueDays=Number(document.getElementById("vdfEditLoanOverdueDays").value),overdueCharges=Number(document.getElementById("vdfEditLoanOverdueCharges").value),due=document.getElementById("vdfEditLoanDue").value,created=document.getElementById("vdfEditLoanCreated").value,status=document.getElementById("vdfEditLoanStatus").value;
    if(!Number.isFinite(amount)||amount<100||amount>50000){alert("Loan amount must be between ₹100 and ₹50,000.");return;}
    if(!Number.isFinite(period)||period<=0||!Number.isFinite(interest)||interest<0||!Number.isFinite(fee)||fee<0||!Number.isFinite(baseTotal)||baseTotal<0||!Number.isFinite(overdueDays)||overdueDays<0||!Number.isFinite(overdueCharges)||overdueCharges<0||!due){alert("Please enter valid loan details.");return;}
    var discount=vdfHasSavedLoanDiscount(loan)?Math.max(0,Math.min(100,Number(loan.discountPercent||0))):0,discountAmount=Math.max(0,Number(loan.discountAmount||0));
    if(discount>0 && discountAmount<=0) discountAmount=Number((baseTotal*discount/100).toFixed(2));
    var statusKey=String(status||"").trim().toLowerCase(),isClearedEdit=statusKey==="amount cleared"||statusKey==="cleared"||statusKey==="paid";
    var finalTotal=Number(Math.max(0,baseTotal-discountAmount+(isClearedEdit?0:overdueCharges)).toFixed(2));
    // IMPORTANT: Edit Full Access edits the selected existing loan IN PLACE.
    // Never push/append here, otherwise an edit can appear as a new Loan 2/3.
    loan.loanNumber = loanIndex + 1;
    loan.amount=amount;loan.period=period;loan.interest=interest;loan.fee=fee;loan.originalTotal=baseTotal;loan.discountAmount=discountAmount;loan.total=finalTotal;loan.repaymentDate=vdfFormatInputToDmy(due);loan.status=status;
    loan.manualOverdueEdited=true;loan.manualOverdueDays=Math.round(overdueDays);loan.manualOverdueCharges=Number(overdueCharges.toFixed(2));loan.overdueFeeCurrentPeriod=Number(overdueCharges.toFixed(2));
    if(created)loan.createdAt=new Date(created+'T12:00:00').toISOString();
    hist.splice(loanIndex, 1, loan);
    hist.forEach(function(x,i){ if(x) x.loanNumber=i+1; });
    app.loanHistory=hist;var latest=hist[hist.length-1];app.amount=latest.amount;app.period=latest.period;app.interest=latest.interest;app.fee=latest.fee;app.total=latest.total;app.repaymentDate=latest.repaymentDate;app.status=latest.status;app.userAccess=hist.some(function(x){return String(x.status||'').toLowerCase()!=="amount cleared";});
    saveLoans(apps);syncToGoogleSheet("update",app);loadAdminApplications(false);var page=document.getElementById("vdfLoanFullPageEditor");if(page)page.remove();showCustomerLoanEditor(id,"edit");alert("Loan "+(loanIndex+1)+" updated successfully.");
}

function editCustomerDetailsOnly(id) {
    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id) === String(id); });
    if (!application) { alert("Customer not found."); return; }

    var name = prompt("Full Name:", application.name || ""); if (name === null) return;
    var mobile = prompt("Mobile Number:", application.mobile || ""); if (mobile === null) return;
    if (!/^[0-9]{10}$/.test(mobile.trim())) { alert("Mobile number must be exactly 10 digits."); return; }
    var coApplicant = prompt("Co-Applicant Number:", application.coApplicant || ""); if (coApplicant === null) return;
    if (coApplicant.trim() && !/^[0-9]{10}$/.test(coApplicant.trim())) { alert("Co-applicant number must be exactly 10 digits."); return; }
    var email = prompt("Email:", application.email || ""); if (email === null) return;
    var upiId = prompt("UPI ID:", application.upiId || ""); if (upiId === null) return;
    var reason = prompt("Reason for Apply:", application.loanReason || ""); if (reason === null) return;
    var address = prompt("Address:", application.address || ""); if (address === null) return;
    var note = prompt("Admin Popup / Note:", application.adminNote || ""); if (note === null) return;
    var access = prompt("Customer Access (Enabled / Disabled):", application.userAccess === false ? "Disabled" : "Enabled"); if (access === null) return;
    access = access.trim().toLowerCase();
    if (access !== "enabled" && access !== "disabled") { alert("User Access must be Enabled or Disabled."); return; }

    application.name = name.trim();
    application.mobile = mobile.trim();
    application.coApplicant = coApplicant.trim();
    application.email = email.trim();
    application.upiId = upiId.trim();
    application.loanReason = reason.trim();
    application.address = address.trim();
    application.adminNote = note.trim();
    application.userAccess = access === "enabled";
    saveLoans(loans);
    syncToGoogleSheet("update", application);
    loadAdminApplications();
    alert("Customer details updated successfully.");
}


function editApplication(id) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();

    var index = loans.findIndex(function(item) {
        return String(item.id) === String(id);
    });

    if (index === -1) {
        alert("Application not found.");
        return;
    }

    var application = loans[index];
    var history = ensureLoanHistory(application);

    var name = prompt("Full Name:", application.name || "");
    if (name === null) return;

    var mobile = prompt("Mobile Number:", application.mobile || "");
    if (mobile === null) return;

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
        alert("Mobile number must be exactly 10 digits.");
        return;
    }

    var coApplicant = prompt("Co-Applicant Number:", application.coApplicant || "");
    if (coApplicant === null) return;

    if (coApplicant.trim() && !/^[0-9]{10}$/.test(coApplicant.trim())) {
        alert("Co-applicant number must be exactly 10 digits.");
        return;
    }

    var email = prompt("Email:", application.email || "");
    if (email === null) return;

    var upiId = prompt("UPI ID:", application.upiId || "");
    if (upiId === null) return;

    var reason = prompt("Reason for Apply:", application.loanReason || "");
    if (reason === null) return;

    var address = prompt("Address:", application.address || "");
    if (address === null) return;

    /* Full access: edit existing loan transactions in place. This function
       must never push/append a new loan while editing an existing customer. */
    var requestedUserAccess = application.userAccess !== false;
    for (var i = 0; i < history.length; i++) {

        var loan = history[i];

        var amountInput = prompt(
            "Loan " + (i + 1) + " Amount:",
            loan.amount || 0
        );
        if (amountInput === null) return;

        var amount = Number(amountInput);
        if (!Number.isFinite(amount) || amount < 100 || amount > 50000) {
            alert("Loan amount must be between ₹100 and ₹50,000.");
            return;
        }

        var periodInput = prompt(
            "Loan " + (i + 1) + " Period (Days):",
            loan.period || 30
        );
        if (periodInput === null) return;

        var period = Number(periodInput);
        if (!Number.isFinite(period) || period <= 0) {
            alert("Loan period must be a valid number.");
            return;
        }

        var repaymentDate = prompt(
            "Loan " + (i + 1) + " Repayment Date (DD/MM/YYYY):",
            loan.repaymentDate || getRepaymentDate()
        );
        if (repaymentDate === null) return;

        var interestInput = prompt(
            "Loan " + (i + 1) + " Interest Amount:",
            loan.interest || 0
        );
        if (interestInput === null) return;

        var interest = Number(interestInput);
        if (!Number.isFinite(interest) || interest < 0) {
            alert("Interest must be a valid amount.");
            return;
        }

        var feeInput = prompt(
            "Loan " + (i + 1) + " Platform Fee:",
            loan.fee == null ? 100 : loan.fee
        );
        if (feeInput === null) return;

        var fee = Number(feeInput);
        if (!Number.isFinite(fee) || fee < 0) {
            alert("Platform fee must be a valid amount.");
            return;
        }

        var totalInput = prompt(
            "Loan " + (i + 1) + " Total Payable:",
            loan.total || 0
        );
        if (totalInput === null) return;

        var total = Number(totalInput);
        if (!Number.isFinite(total) || total < 0) {
            alert("Total payable must be a valid amount.");
            return;
        }

        var status = prompt(
            "Loan " + (i + 1) + " Status (Pending / Approved / Rejected / Amount Cleared):",
            loan.status || "Pending"
        );
        if (status === null) return;

        status = status.trim();

        var validStatuses = [
            "Pending",
            "Approved",
            "Rejected",
            "Amount Cleared"
        ];

        if (!validStatuses.includes(status)) {
            alert("Invalid status.");
            return;
        }

        var accessInput = prompt(
            "Customer Access (Enabled / Disabled):",
            application.userAccess === false ? "Disabled" : "Enabled"
        );
        if (accessInput === null) return;

        accessInput = accessInput.trim().toLowerCase();

        if (accessInput !== "enabled" && accessInput !== "disabled") {
            alert("User Access must be Enabled or Disabled.");
            return;
        }
        requestedUserAccess = accessInput === "enabled";

        loan.amount = amount;
        loan.period = period;
        loan.interest = interest;
        loan.fee = fee;
        loan.total = total;
        loan.repaymentDate = repaymentDate.trim();
        loan.status = status;
    }

    var note = prompt(
        "Admin Popup / Note:",
        application.adminNote || ""
    );
    if (note === null) return;

    application.name = name.trim();
    application.mobile = mobile.trim();
    application.coApplicant = coApplicant.trim();
    application.email = email.trim();
    application.upiId = upiId.trim();
    application.loanReason = reason.trim();
    application.address = address.trim();
    application.adminNote = note.trim();
    application.loanHistory = history;

    var latest = history[history.length - 1];

    application.amount = latest.amount;
    application.period = latest.period;
    application.interest = latest.interest;
    application.fee = latest.fee;
    application.total = latest.total;
    application.repaymentDate = latest.repaymentDate;
    application.status = latest.status;

    application.userAccess = requestedUserAccess;

    saveLoans(loans);
    syncToGoogleSheet("update", application);

    loadAdminApplications();

    alert("All customer and loan history details updated successfully.");
}


/* ================= MONTHLY ADMIN DASHBOARD ================= */



function setupAdminMonthSelector(loans) {

    var select = document.getElementById("adminMonth");

    if (!select) return;

    var currentValue = select.value;
    var months = {};

    /* Dashboard months are persistent and independent of customer records. */
    var dashboardData = getDashboardData();
    Object.keys(dashboardData).forEach(function(key) {
        months[key] = true;
    });

    /* Include months from current loans only when the dashboard has not yet
       created a permanent record for that month. */
    loans.forEach(function(application) {
        var history = ensureLoanHistory(application);
        history.forEach(function(loan) {
            var date = new Date(loan.createdAt);
            if (isNaN(date.getTime()) && loan.createdAt) {
                var match = String(loan.createdAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (match) {
                    date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
                }
            }
            if (!isNaN(date.getTime())) {
                var key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
                months[key] = true;
            }
        });
    });

    var now = new Date();
    var currentKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    months[currentKey] = true;

    var keys = Object.keys(months).sort().reverse();

    select.innerHTML = '<option value="ALL">ALL</option>' + keys.map(function(key) {
        var parts = key.split("-");
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        var label = date.toLocaleString("en-IN", { month: "long", year: "numeric" });
        return '<option value="' + key + '">' + label + '</option>';
    }).join("");

    if (currentValue === "ALL" || (currentValue && keys.includes(currentValue))) {
        select.value = currentValue;
    } else {
        select.value = "ALL";
    }
}


function getDashboardOverrides() {
    try {
        return JSON.parse(localStorage.getItem("vdfDashboardOverrides") || "{}");
    } catch (error) {
        return {};
    }
}

function saveDashboardOverrides(overrides) {
    localStorage.setItem("vdfDashboardOverrides", JSON.stringify(overrides));
}

/*
   Dashboard is intentionally independent from customer/application data.
   Once a month's values are captured here, deleting/rejecting/clearing a
   customer cannot recalculate or reduce the dashboard numbers.
   Only editDashboardMetric() can change these saved values afterwards.
*/
function recordDashboardStatusChange(loan, status) {
    if (!loan) return;

    var normalized = String(status || loan.status || "Pending").trim().toLowerCase();
    if (normalized !== "approved" && normalized !== "amount cleared" && normalized !== "cleared") {
        return;
    }

    var createdAt = new Date(loan.createdAt || new Date());
    if (isNaN(createdAt.getTime()) && loan.createdAt) {
        var match = String(loan.createdAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) {
            createdAt = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        }
    }
    if (isNaN(createdAt.getTime())) createdAt = new Date();

    var monthKey = createdAt.getFullYear() + "-" + String(createdAt.getMonth() + 1).padStart(2, "0");
    var data = getDashboardData();
    if (!data[monthKey]) {
        data[monthKey] = { loanAmount: 0, interest: 0, fee: 0, overdue: 0, total: 0, profit: 0, activeLoans: 0, _entries: [] };
    }
    if (!Array.isArray(data[monthKey]._entries)) data[monthKey]._entries = [];

    var entryId = String(loan.dashboardEntryId || "");
    if (!entryId) {
        entryId = "VD-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
        loan.dashboardEntryId = entryId;
    }

    var entry = data[monthKey]._entries.find(function(item) {
        return String(item.id) === entryId;
    });
    if (!entry) {
        entry = { id: entryId, approvedRecorded: false, profitRecorded: false, activeClosedRecorded: false };
        data[monthKey]._entries.push(entry);
    }

    /* APPROVED: record loan figures only when Admin actually approves. */
    if (normalized === "approved" && !entry.approvedRecorded) {
        data[monthKey].loanAmount += Number(loan.amount) || 0;
        data[monthKey].interest += Number(loan.interest) || 0;
        data[monthKey].fee += Number(loan.fee) || 0;
        data[monthKey].total += Number(loan.total) || 0;
        data[monthKey].activeLoans = (Number(data[monthKey].activeLoans) || 0) + 1;
        entry.approvedRecorded = true;
    }

    /* AMOUNT CLEARED: always record this loan's profit once when repayment is cleared.
       Do not depend on approvedRecorded, because older/previously approved loans
       may not have that historical flag saved. */
    if ((normalized === "amount cleared" || normalized === "cleared") && !entry.profitRecorded) {
        var baseAmount = Number(loan.amount) || 0;
        var interestAmount = Number(loan.interest) || 0;
        var platformFee = Number(loan.fee) || 0;
        var totalAmount = Number(loan.total) || 0;
        var explicitOverdue = Math.max(0, Number(loan.overdueFeeAccrued || 0));
        var overdueFromTotal = Math.max(0, totalAmount - baseAmount - interestAmount - platformFee);
        var overdueMoney = Math.max(explicitOverdue, overdueFromTotal);
        data[monthKey].overdue = (Number(data[monthKey].overdue) || 0) + overdueMoney;
        data[monthKey].profit += interestAmount + platformFee + overdueMoney;
        entry.profitRecorded = true;
    }

    /* Active Loans is saved independently from customer records. Clearing a loan
       reduces the saved active count once; deleting a customer does not change it. */
    if ((normalized === "amount cleared" || normalized === "cleared") && entry.approvedRecorded && !entry.activeClosedRecorded) {
        data[monthKey].activeLoans = Math.max(0, (Number(data[monthKey].activeLoans) || 0) - 1);
        entry.activeClosedRecorded = true;
    }

    saveDashboardData(data);
    syncDashboardEventToBackend(loan, normalized);
}

function getDashboardData() {
    try {
        return JSON.parse(localStorage.getItem("vdfDashboardData") || "{}");
    } catch (error) {
        return {};
    }
}

function saveDashboardData(data) {
    localStorage.setItem("vdfDashboardData", JSON.stringify(data));
}

function calculateDashboardMonthFromLoans(loans, selectedMonth) {
    var totalAmount = 0, totalInterest = 0, totalFee = 0, totalPayable = 0;
    var totalOverdue = 0, totalProfit = 0, activeLoans = 0;

    (Array.isArray(loans) ? loans : []).forEach(function(application) {
        ensureLoanHistory(application).forEach(function(loan) {
            var date = new Date(loan.createdAt);
            if (isNaN(date.getTime()) && loan.createdAt) {
                var match = String(loan.createdAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (match) date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
            }
            if (isNaN(date.getTime())) return;
            var key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
            if (key !== selectedMonth) return;
            var status = String(loan.status || "").trim().toLowerCase();
            if (status === "rejected" || status === "pending" || !status) return;

            if (status === "approved") activeLoans++;
            if (status === "approved" || status === "amount cleared" || status === "cleared") {
                totalAmount += Number(loan.amount) || 0;
                totalInterest += Number(loan.interest) || 0;
                totalFee += Number(loan.fee) || 0;
                totalPayable += Number(loan.total) || 0;
            }
            if (status === "amount cleared" || status === "cleared") {
                var baseAmount = Number(loan.amount) || 0;
                var interestAmount = Number(loan.interest) || 0;
                var platformFee = Number(loan.fee) || 0;
                var loanTotal = Number(loan.total) || 0;
                var explicitOverdue = Math.max(0, Number(loan.overdueFeeAccrued || 0));
                var overdueFromTotal = Math.max(0, loanTotal - baseAmount - interestAmount - platformFee);
                var overdueMoney = Math.max(explicitOverdue, overdueFromTotal);
                totalOverdue += overdueMoney;
                totalProfit += interestAmount + platformFee + overdueMoney;
            }
        });
    });
    return {loanAmount:totalAmount, interest:totalInterest, fee:totalFee, overdue:totalOverdue,
        total:totalPayable, profit:totalProfit, activeLoans:activeLoans};
}

/* Build analytics from the current customer/loan records, not a stale snapshot.
   Manual pencil corrections are applied on top and remain editable. */
function getVdLiveDashboardData() {
    var loans = getLoans(), monthKeys = {}, live = {}, overrides = getDashboardOverrides();
    /* If loan/customer records change, drop old manual corrections so fresh
       approvals, repayments, edits and deletions immediately drive the totals. */
    var signature = JSON.stringify(loans.map(function(app) {
        return {id:String(app.id || ""), history:ensureLoanHistory(app).map(function(loan) {
            return [String(loan.dashboardEntryId || ""), String(loan.createdAt || ""), String(loan.status || ""),
                Number(loan.amount)||0, Number(loan.interest)||0, Number(loan.fee)||0, Number(loan.total)||0,
                Number(loan.overdueFeeAccrued)||0, Number(loan.period)||0];
        })};
    }));
    var previousSignature = localStorage.getItem("vdfAnalyticsLoanSignature");
    if (previousSignature && previousSignature !== signature) {
        overrides = {};
        saveDashboardOverrides(overrides);
    }
    localStorage.setItem("vdfAnalyticsLoanSignature", signature);
    var now = new Date();
    monthKeys[now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0")] = true;
    loans.forEach(function(app) {
        ensureLoanHistory(app).forEach(function(loan) {
            var d = new Date(loan.createdAt);
            if (isNaN(d.getTime()) && loan.createdAt) {
                var m = String(loan.createdAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (m) d = new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
            }
            if (!isNaN(d.getTime())) monthKeys[d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")] = true;
        });
    });
    Object.keys(overrides).forEach(function(k){monthKeys[k]=true;});
    Object.keys(monthKeys).forEach(function(k) {
        live[k] = calculateDashboardMonthFromLoans(loans, k);
        if (overrides[k]) Object.keys(overrides[k]).forEach(function(metric) {
            if (Object.prototype.hasOwnProperty.call(live[k], metric)) live[k][metric] = Number(overrides[k][metric]) || 0;
        });
    });
    return live;
}

function editDashboardMetric(metric) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var select = document.getElementById("adminMonth");
    if (!select || !select.value) {
        alert("Please select a month first.");
        return;
    }

    var labels = {
        loanAmount: "Total Loan Amount",
        interest: "Total Interest",
        fee: "Total Platform Fee",
        total: "Total Payable",
        profit: "Total Profit",
        activeLoans: "Active Loans"
    };

    var elementIds = {
        loanAmount: "monthlyLoanAmount",
        interest: "monthlyInterest",
        fee: "monthlyFee",
        total: "monthlyTotal",
        profit: "monthlyProfit",
        activeLoans: "vdSummaryActiveLoans"
    };

    var monthKey = select.value;
    var liveData = getVdLiveDashboardData();
    var overrides = getDashboardOverrides();
    if (!overrides[monthKey]) overrides[monthKey] = {};
    var currentValue = Number((overrides[monthKey] && overrides[monthKey][metric] !== undefined)
        ? overrides[monthKey][metric] : ((liveData[monthKey] || {})[metric] || 0));
    var value = prompt(
        "Edit " + labels[metric] + " for " + monthKey + ":\nEnter the corrected value. Dashboard changes only when you edit it manually.",
        String(currentValue)
    );

    if (value === null) return;

    value = Number(String(value).replace(/,/g, "").trim());
    if (!Number.isFinite(value) || value < 0) {
        alert("Please enter a valid value.");
        return;
    }
    if (metric === "activeLoans") value = Math.floor(value);

    overrides[monthKey][metric] = value;
    saveDashboardOverrides(overrides);
    syncDashboardEditToBackend(monthKey, metric, value);
    updateAdminMonthlyDashboard();
}


function openAdminNotebook() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var overlay = document.getElementById("vdfAdminNotebookOverlay");
    var text = document.getElementById("vdfAdminNotebookText");
    if (text) text.value = localStorage.getItem("vdFinanceAdminNotebook") || "";
    if (overlay) { overlay.classList.add("show"); overlay.setAttribute("aria-hidden","false"); }
    if (text) setTimeout(function(){ text.focus(); }, 50);
}
function closeAdminNotebook() {
    saveAdminNotebook(false);
    var overlay = document.getElementById("vdfAdminNotebookOverlay");
    if (overlay) { overlay.classList.remove("show"); overlay.setAttribute("aria-hidden","true"); }
}
function saveAdminNotebook(showMessage) {
    var text = document.getElementById("vdfAdminNotebookText");
    if (!text) return;
    localStorage.setItem("vdFinanceAdminNotebook", text.value || "");
    var saved = document.getElementById("vdfNotebookSavedText");
    if (saved) saved.textContent = "Saved • " + new Date().toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"});
    if (showMessage) alert("Notebook saved.");
}


/* ================= ADMIN INTEREST RECORDS / BACKUP BOOK ================= */
var vdfInterestPage = 1;
var vdfInterestEditId = "";

function getVdfInterestBookData() {
    try {
        var data = JSON.parse(localStorage.getItem("vdFinanceInterestBook") || "{}");
        if (!data || typeof data !== "object") data = {};
        for (var i = 1; i <= 5; i++) {
            if (!data[i]) data[i] = { note: "", rows: [] };
            if (!Array.isArray(data[i].rows)) data[i].rows = [];
        }
        return data;
    } catch (e) {
        var fresh = {};
        for (var i = 1; i <= 5; i++) fresh[i] = { note: "", rows: [] };
        return fresh;
    }
}
function saveVdfInterestBookData(data) {
    localStorage.setItem("vdFinanceInterestBook", JSON.stringify(data));
}
function openVdfInterestBook() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var overlay = document.getElementById("vdfInterestBookOverlay");
    if (overlay) { overlay.classList.add("show"); overlay.setAttribute("aria-hidden", "false"); }
    selectVdfInterestPage(vdfInterestPage || 1);
    populateVdfInterestCustomers();
}
function closeVdfInterestBook() {
    saveVdfInterestNote(false);
    var overlay = document.getElementById("vdfInterestBookOverlay");
    if (overlay) { overlay.classList.remove("show"); overlay.setAttribute("aria-hidden", "true"); }
}
function selectVdfInterestPage(page) {
    saveVdfInterestNote(false);
    vdfInterestPage = Math.max(1, Math.min(5, Number(page) || 1));
    document.querySelectorAll(".vdf-interest-tab").forEach(function(btn) {
        btn.classList.toggle("active", Number(btn.getAttribute("data-page")) === vdfInterestPage);
    });
    var data = getVdfInterestBookData();
    var note = document.getElementById("vdfInterestNote");
    if (note) note.value = (data[vdfInterestPage] && data[vdfInterestPage].note) || "";
    var title = document.getElementById("vdfInterestPageTitle");
    if (title) title.textContent = "Note " + vdfInterestPage;
    clearVdfInterestForm();
    renderVdfInterestRows();
}
function saveVdfInterestNote(showMessage) {
    var note = document.getElementById("vdfInterestNote");
    if (!note) return;
    var data = getVdfInterestBookData();
    data[vdfInterestPage].note = note.value || "";
    saveVdfInterestBookData(data);
    var saved = document.getElementById("vdfInterestSavedText");
    if (saved) saved.textContent = "Saved • " + new Date().toLocaleTimeString("en-IN", {hour:"2-digit", minute:"2-digit"});
    if (showMessage) alert("Note " + vdfInterestPage + " saved.");
}
function populateVdfInterestCustomers() {
    var select = document.getElementById("vdfInterestCustomer");
    if (!select) return;
    var loans = getLoans();
    select.innerHTML = '<option value="">Select customer</option>' + loans.map(function(app, index) {
        return '<option value="' + index + '">' + escapeHTML(app.name || "Customer") + ' • ' + escapeHTML(app.id || "") + '</option>';
    }).join("");
}
function loadVdfInterestLoans() {
    var customer = document.getElementById("vdfInterestCustomer");
    var loanSelect = document.getElementById("vdfInterestLoan");
    if (!customer || !loanSelect) return;
    loanSelect.innerHTML = '<option value="">Select loan</option>';
    if (customer.value === "") return;
    var app = getLoans()[Number(customer.value)];
    if (!app) return;
    var history = ensureLoanHistory(app);
    loanSelect.innerHTML += history.map(function(loan, index) {
        return '<option value="' + index + '">Loan ' + (index + 1) + ' • ' + money(loan.amount || 0) + '</option>';
    }).join("");
}
function loadVdfInterestLoanDetails() {
    var customer = document.getElementById("vdfInterestCustomer");
    var loanSelect = document.getElementById("vdfInterestLoan");
    if (!customer || !loanSelect || customer.value === "" || loanSelect.value === "") return;
    var app = getLoans()[Number(customer.value)];
    if (!app) return;
    var loan = ensureLoanHistory(app)[Number(loanSelect.value)];
    if (!loan) return;
    document.getElementById("vdfInterestName").value = app.name || "";
    document.getElementById("vdfInterestDate").value = vdfDateForInput(loan.createdAt || app.createdAt || "");
    document.getElementById("vdfInterestAmount").value = Number(loan.amount || 0);
    document.getElementById("vdfInterestInterest").value = Number(loan.interest || 0);
    var feeEl = document.getElementById("vdfInterestFee"); if (feeEl) feeEl.value = Number(loan.fee || 0);
    vdfNote1Calculate();
    document.getElementById("vdfInterestDue").value = vdfDateForInput(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period) || "");
}
function vdfDateForInput(value) {
    if (!value) return "";
    var text = String(value).trim();
    var dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return dmy[3] + "-" + String(dmy[2]).padStart(2,"0") + "-" + String(dmy[1]).padStart(2,"0");
    var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return iso[1] + "-" + String(iso[2]).padStart(2,"0") + "-" + String(iso[3]).padStart(2,"0");
    var d = new Date(text);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function vdfDisplayInputDate(value) {
    if (!value) return "—";
    var p = String(value).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : value;
}
function vdfNote1Calculate() {
    var amount = Math.max(0, Number(document.getElementById("vdfInterestAmount")?.value || 0));
    var interest = Math.max(0, Number(document.getElementById("vdfInterestInterest")?.value || 0));
    var fee = Math.max(0, Number(document.getElementById("vdfInterestFee")?.value || 0));
    var totalEl = document.getElementById("vdfInterestTotal");
    if (totalEl) totalEl.value = Number((amount + interest + fee).toFixed(2));
}
function addVdfInterestRecord() {
    var name = document.getElementById("vdfInterestName").value.trim();
    var date = document.getElementById("vdfInterestDate").value;
    var amount = Number(document.getElementById("vdfInterestAmount").value || 0);
    var interest = Number(document.getElementById("vdfInterestInterest").value || 0);
    var fee = Number(document.getElementById("vdfInterestFee")?.value || 0);
    vdfNote1Calculate();
    var total = Number(document.getElementById("vdfInterestTotal").value || 0);
    var due = document.getElementById("vdfInterestDue").value;
    if (!name || !date || !amount) { alert("Name, given date and given amount are required."); return; }
    var data = getVdfInterestBookData();
    var rows = data[vdfInterestPage].rows;
    var oldRow = vdfInterestEditId ? rows.find(function(item){ return item.id === vdfInterestEditId; }) : null;
    var row = { id: vdfInterestEditId || ("IR-" + Date.now()), name:name, date:date, amount:amount, interest:interest, fee:fee, total:total, due:due, recordStatus:(oldRow&&oldRow.recordStatus)||"Pending" };
    if (vdfInterestEditId) {
        var idx = rows.findIndex(function(item){ return item.id === vdfInterestEditId; });
        if (idx !== -1) rows[idx] = row; else rows.push(row);
    } else rows.push(row);
    saveVdfInterestBookData(data);
    clearVdfInterestForm();
    renderVdfInterestRows();
}
function editVdfInterestRecord(id) {
    var data = getVdfInterestBookData();
    var row = data[vdfInterestPage].rows.find(function(item){ return String(item.id) === String(id); });
    if (!row) return;
    vdfInterestEditId = id;
    document.getElementById("vdfInterestName").value = row.name || "";
    document.getElementById("vdfInterestDate").value = row.date || "";
    document.getElementById("vdfInterestAmount").value = row.amount || 0;
    document.getElementById("vdfInterestInterest").value = row.interest || 0;
    var feeEl = document.getElementById("vdfInterestFee"); if (feeEl) feeEl.value = row.fee != null ? row.fee : 100;
    document.getElementById("vdfInterestTotal").value = row.total || 0;
    document.getElementById("vdfInterestDue").value = row.due || "";
    var btn = document.getElementById("vdfInterestAddBtn");
    if (btn) btn.textContent = "Update Record";
}
function deleteVdfInterestRecord(id) {
    if (!confirm("Delete this interest record?")) return;
    var data = getVdfInterestBookData();
    data[vdfInterestPage].rows = data[vdfInterestPage].rows.filter(function(item){ return item.id !== id; });
    saveVdfInterestBookData(data);
    renderVdfInterestRows();
}
function clearVdfInterestForm() {
    vdfInterestEditId = "";
    ["vdfInterestName","vdfInterestDate","vdfInterestAmount","vdfInterestInterest","vdfInterestFee","vdfInterestTotal","vdfInterestDue"].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=""; });
    var c=document.getElementById("vdfInterestCustomer"), l=document.getElementById("vdfInterestLoan");
    if(c)c.value=""; if(l)l.innerHTML='<option value="">Select loan</option>';
    var btn=document.getElementById("vdfInterestAddBtn"); if(btn)btn.textContent="Add Record";
}
function renderVdfInterestRows() {
    var tbody = document.getElementById("vdfInterestTableBody");
    if (!tbody) return;
    var rows = getVdfInterestBookData()[vdfInterestPage].rows || [];
    tbody.innerHTML = rows.length ? rows.map(function(row) {
        return '<tr><td>'+escapeHTML(row.name||"")+'</td><td>'+escapeHTML(vdfDisplayInputDate(row.date))+'</td><td>'+money(row.amount||0)+'</td><td>'+money(row.interest||0)+'</td><td>'+money(row.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(row.due))+'</td><td class="vdf-interest-actions"><button type="button" title="Edit row" aria-label="Edit row" onclick="editVdfInterestRecord(\''+row.id+'\')">✏️</button><button type="button" class="danger" onclick="deleteVdfInterestRecord(\''+row.id+'\')">Delete</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="vdf-interest-empty">No records in Note '+vdfInterestPage+'.</td></tr>';
}
function toggleAdminPassword(){
    var input=document.getElementById('adminPassword');
    var btn=document.getElementById('adminPasswordEye');
    var icon=document.getElementById('adminPasswordEyeIcon');
    if(!input) return;
    var show=input.type==='password';
    input.type=show?'text':'password';
    if(icon) icon.textContent=show?'🙈':'👁';
    if(btn){btn.setAttribute('aria-label',show?'Hide password':'Show password');btn.title=show?'Hide password':'Show password';}
    input.focus();
}

function printVdfInterestBook() {
    saveVdfInterestNote(false);
    var data = getVdfInterestBookData()[vdfInterestPage];
    var rows = data.rows || [];
    var generated = new Date().toLocaleString("en-IN");
    var html = '<!doctype html><html><head><title>VD Finance Interest Records</title></head><body><h1>VD Finance – Interest Records</h1><p><b>Note '+vdfInterestPage+'</b></p><p>Generated: '+escapeHTML(generated)+'</p><div class="note">'+escapeHTML(data.note||"No note")+'</div><table><thead><tr><th>Person Name</th><th>Given Date</th><th>Given Amount</th><th>Interest</th><th>Platform Fee</th><th>Total Amount</th><th>Due Date</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+escapeHTML(r.name||"")+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.date))+'</td><td>'+money(r.amount||0)+'</td><td>'+money(r.interest||0)+'</td><td>'+money(r.fee!=null?r.fee:100)+'</td><td>'+money(r.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.due))+'</td></tr>';}).join('')+'</tbody></table></body></html>';
    var w=window.open("","_blank"); if(!w){alert("Please allow popups to print.");return;} w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(function(){w.print();},250);
}
function downloadVdfInterestPDF() {
    saveVdfInterestNote(false);
    if (!window.jspdf || !window.jspdf.jsPDF) { alert("PDF library is not available."); return; }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({unit:"mm",format:"a4"});
    var data = getVdfInterestBookData()[vdfInterestPage];
    var rows = data.rows || [];
    var y=18;
    doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.text("VD Finance - Interest Records",14,y); y+=8;
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.text("Note "+vdfInterestPage+" | Generated: "+new Date().toLocaleString("en-IN"),14,y); y+=8;
    doc.setFontSize(10); var noteLines=doc.splitTextToSize(data.note||"No note",180); doc.text(noteLines,14,y); y+=noteLines.length*5+6;
    var headers=["Name","Given Date","Amount","Interest","Total","Due Date"];
    var widths=[42,28,27,27,30,30];
    function header(){doc.setFont("helvetica","bold");doc.setFontSize(8);var x=13;headers.forEach(function(h,i){doc.rect(x,y,widths[i],8);doc.text(h,x+2,y+5);x+=widths[i];});y+=8;doc.setFont("helvetica","normal");}
    header();
    rows.forEach(function(r){ if(y>278){doc.addPage();y=18;header();} var vals=[r.name||"",vdfDisplayInputDate(r.date),String(Number(r.amount||0).toFixed(0)),String(Number(r.interest||0).toFixed(0)),String(Number(r.total||0).toFixed(0)),vdfDisplayInputDate(r.due)];var x=13;vals.forEach(function(v,i){doc.rect(x,y,widths[i],8);doc.text(String(v).slice(0,24),x+2,y+5);x+=widths[i];});y+=8; });
    doc.save("VD_Finance_Interest_Records_Note_"+vdfInterestPage+".pdf");
}

/* ================= ADMIN ACTION CENTER ================= */
function getVdLoanStartDateForActionCenter(loan, application) {
    var raw = (loan && loan.createdAt) || (application && application.createdAt) || "";
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    }
    var text = String(raw).trim();
    var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    var dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    var parsed = new Date(text);
    if (isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getVdLoanDueDateFromStart(loan, application) {
    /* Prefer the exact stored repayment date so Day-wise loans keep their own due date. */
    var stored = (loan && loan.repaymentDate) || (application && application.repaymentDate) || "";
    if (stored) {
        var t = String(stored).trim();
        var dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        var parsedStored = new Date(t);
        if (!isNaN(parsedStored.getTime())) return new Date(parsedStored.getFullYear(), parsedStored.getMonth(), parsedStored.getDate());
    }
    var start = getVdLoanStartDateForActionCenter(loan, application);
    if (!start) return null;
    var due = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var period = Number((loan && loan.period) || (application && application.period) || 30);
    due.setDate(due.getDate() + (period > 0 ? period : 30));
    return due;
}

function getVdActionCenterItems() {
    var applications = getLoans();
    var items = [];
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    applications.forEach(function(application) {
        var history = ensureLoanHistory(application);
        history.forEach(function(loan, loanIndex) {
            var status = String(loan.status || application.status || "Pending").trim();
            var statusLower = status.toLowerCase();

            /* VD Finance rule: repayment due date is the individual loan taken date + 30 days.
               Overdue starts only on the following day. */
            var dueDate = getVdLoanDueDateFromStart(loan, application);
            var daysToDue = null;
            if (dueDate && !isNaN(dueDate.getTime())) {
                daysToDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
            }

            var category = "";
            if (statusLower === "pending") category = "pending";
            else if (statusLower === "approved" || statusLower === "active") {
                if (daysToDue !== null && daysToDue < 0) category = "overdue";
                else if (daysToDue === 0) category = "today";
                else if (daysToDue !== null && daysToDue >= 1 && daysToDue <= 5) category = "soon";
            }
            if (!category) return;

            var overdue = category === "overdue" ? Math.abs(daysToDue || 0) : 0;
            var baseTotal = Number(loan.total || application.total || 0);
            var accrued = Number(loan.overdueFeeAccrued || 0);
            var lateRate = Number(loan.period) > 0 && Number(loan.period) < 30 ? 40 : 79;
            var payable = baseTotal + (accrued > 0 ? accrued : (overdue * lateRate));
            items.push({
                application: application,
                loan: loan,
                loanIndex: loanIndex,
                loanNumber: loanIndex + 1,
                category: category,
                daysToDue: daysToDue,
                overdueDays: overdue,
                payable: payable,
                dueDate: dueDate,
                dueText: dueDate ? dueDate.toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}) : "Not set"
            });
        });
    });

    var priority = {overdue:0, today:1, soon:2, pending:3};
    items.sort(function(a,b) {
        if (priority[a.category] !== priority[b.category]) return priority[a.category] - priority[b.category];
        return Number(a.daysToDue || 0) - Number(b.daysToDue || 0);
    });
    return items;
}

function closeVdActionCenter() {
    var modal = document.getElementById("vdActionCenterModal");
    if (modal) modal.remove();
}

function openVdActionCenter() {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    closeVdActionCenter();
    var items = getVdActionCenterItems();
    var counts = {active:0,overdue:0,today:0,soon:0,pending:0};
    items.forEach(function(item){ counts[item.category]++; });
    /* Active Accounts is a separate drill-down category. It includes every
       currently Approved/Active loan, not only loans that are due soon. */
    var activeItems = [];
    getLoans().forEach(function(application) {
        ensureLoanHistory(application).forEach(function(loan, loanIndex) {
            var statusLower = String(loan.status || application.status || "Pending").trim().toLowerCase();
            if (statusLower !== "approved" && statusLower !== "active") return;
            var dueDate = getVdLoanDueDateFromStart(loan, application);
            var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            var daysToDue = dueDate && !isNaN(dueDate.getTime()) ? Math.round((dueDate.getTime()-today.getTime())/86400000) : null;
            activeItems.push({
                application: application,
                loan: loan,
                loanIndex: loanIndex,
                loanNumber: loanIndex + 1,
                category: "active",
                daysToDue: daysToDue,
                overdueDays: daysToDue !== null && daysToDue < 0 ? Math.abs(daysToDue) : 0,
                payable: Number(loan.total || application.total || 0),
                dueDate: dueDate,
                dueText: dueDate ? dueDate.toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}) : "Not set"
            });
        });
    });
    counts.active = activeItems.length;

    var modal = document.createElement("div");
    modal.id = "vdActionCenterModal";
    modal.style.cssText = "position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;box-sizing:border-box;";
    var box = document.createElement("div");
    box.style.cssText = "width:min(980px,100%);max-height:92vh;overflow:auto;background:#080808;color:#fff;border:1px solid #c9972d;border-radius:18px;padding:20px;box-shadow:0 22px 70px rgba(0,0,0,.7);box-sizing:border-box;";

    function card(category, title, count, border, background, color) {
        return '<button type="button" onclick="showVdActionCategory(\''+category+'\')" style="width:100%;text-align:left;border:1px solid '+border+';border-radius:12px;padding:12px;background:'+background+';color:#fff;cursor:pointer;">' +
            '<small>'+title+'</small><strong style="display:block;font-size:25px;color:'+color+';">'+count+'</strong><span style="font-size:11px;color:#aaa;">Click to view details</span></button>';
    }

    var cards = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:16px 0;">' +
        card('active','Active Accounts',counts.active,'#2f6f4e','#07150e','#7ee2a8') +
        card('overdue','Overdue',counts.overdue,'#7a2020','#160909','#ff7777') +
        card('today','Due Today',counts.today,'#c9972d','#171205','#f4d47d') +
        card('soon','Due in 1–5 Days',counts.soon,'#8d742f','#121006','#f4d47d') +
        card('pending','Pending Approval',counts.pending,'#555','#111','#ddd') + '</div>';

    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">' +
        '<div><h2 style="margin:0;color:#f4d47d;">🔔 Action Center</h2><p style="margin:6px 0 0;color:#aaa;">Select a category to view the customer and loan details.</p></div>' +
        '<button type="button" onclick="closeVdActionCenter()" style="border:0;background:#222;color:#fff;border-radius:9px;padding:9px 12px;cursor:pointer;font-size:18px;">✕</button></div>' + cards +
        '<div id="vdActionCategoryDetails" style="margin-top:12px;"><div style="padding:22px;text-align:center;color:#777;border:1px dashed #333;border-radius:12px;">Click a category above to view details.</div></div>';
    modal.appendChild(box); document.body.appendChild(modal);
    window.vdActionCenterItems = items.concat(activeItems);
}

function showVdActionCategory(category) {
    var target = document.getElementById("vdActionCategoryDetails");
    if (!target) return;
    var items = Array.isArray(window.vdActionCenterItems) ? window.vdActionCenterItems : [];
    var filtered = items.filter(function(item){ return item.category === category; });
    var titles = {active:"Active Accounts", overdue:"Overdue Loans", today:"Due Today", soon:"Due in 1–5 Days", pending:"Pending Approval"};
    var rows = filtered.map(function(item) {
        var label = item.category === "active" ? (item.daysToDue === null ? "Active" : item.daysToDue < 0 ? (Math.abs(item.daysToDue) + " Days Overdue") : item.daysToDue === 0 ? "Due Today" : ("Due in " + item.daysToDue + " Day" + (item.daysToDue === 1 ? "" : "s"))) : item.category === "overdue" ? (item.overdueDays + " Days Overdue") : item.category === "today" ? "Due Today" : item.category === "soon" ? ("Due in " + item.daysToDue + " Day" + (item.daysToDue === 1 ? "" : "s")) : "Pending Approval";
        var payable = item.category === "pending" ? "—" : ("₹" + Number(item.payable || 0).toLocaleString("en-IN", {maximumFractionDigits:2}));
        return '<div style="border:1px solid #292929;border-radius:13px;padding:14px;margin:10px 0;background:#0e0e0e;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;">' +
            '<div><div style="font-weight:800;color:#f4d47d;">'+escapeHTML(item.application.name || "Customer")+' • Loan '+item.loanNumber+'</div>' +
            '<div style="font-size:13px;color:#aaa;margin-top:4px;">'+escapeHTML(item.application.id || "")+' • '+escapeHTML(label)+' • Due: '+escapeHTML(item.dueText)+'</div>' +
            '<div style="font-size:14px;margin-top:5px;">Payable: <b>'+payable+'</b></div></div>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;">' +
            '<button type="button" class="btn btn-primary" onclick="closeVdActionCenter();showCustomerLoanEditor(\''+String(item.application.id || '').replace(/'/g,"\\'")+'\')">View</button>' +
            '<button type="button" class="btn btn-primary" onclick="sendAdminEmailForLoan(\''+String(item.application.id || '').replace(/'/g,"\\'")+'\','+item.loanNumber+')">Send Mail</button>' +
            '</div></div>';
    }).join("");
    target.innerHTML = '<h3 style="color:#f4d47d;margin:0 0 8px;">'+escapeHTML(titles[category] || "Details")+'</h3>' +
        (rows || '<div style="padding:24px;text-align:center;color:#aaa;border:1px dashed #444;border-radius:12px;">No records in this category.</div>');
}

function sendAdminEmailForLoan(id, loanNumber) {
    closeVdActionCenter();
    window.vdfPresetAdminMailLoan = Number(loanNumber || 0);
    sendAdminEmail(id);
}

function toggleAdminTopMenu() {
    var menu = document.getElementById("vdfAdminTopMenu");
    var button = document.getElementById("vdfAdminTopViewButton");
    if (!menu || !button) return;
    var opening = menu.style.display === "none" || !menu.style.display;
    menu.style.display = opening ? "flex" : "none";
    button.setAttribute("aria-expanded", opening ? "true" : "false");
    button.textContent = opening ? "View ▴" : "View ▾";
}

function editSelectedPieMetric() {
    var selector = document.getElementById("vdPieMetric");
    var metric = selector ? selector.value : "total";
    var map = { total: "total", profit: "profit", fee: "fee" };
    editDashboardMetric(map[metric] || "total");
}

function updateAdminMonthlyDashboard() {
    var select = document.getElementById("adminMonth");
    if (!select || !select.value) return;
    renderVdAdminAnalytics(select.value);
}

function vdDashboardMonthLabel(key, shortLabel) {
    if (String(key || "").toUpperCase() === "ALL") return "All Months";
    var parts = String(key || "").split("-");
    if (parts.length !== 2) return key || "";
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return date.toLocaleString("en-IN", shortLabel ? { month:"short" } : { month:"long", year:"numeric" });
}

function vdCanvasSize(canvas) {
    var rect = canvas.getBoundingClientRect();
    var ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio,0,0,ratio,0,0);
    return { ctx:ctx, width:rect.width, height:rect.height };
}

function vdDrawProfitTrend(monthKeys, dashboardData) {
    var canvas = document.getElementById("vdLoanTrendChart");
    if (!canvas) return;
    var box = vdCanvasSize(canvas), ctx = box.ctx, w = box.width, h = box.height;
    ctx.clearRect(0,0,w,h);
    var pad = {l:48,r:16,t:18,b:38};
    var values = monthKeys.map(function(k){ return Number((dashboardData[k] || {}).profit) || 0; });
    var max = Math.max.apply(null, values.concat([1]));
    max = Math.ceil(max / 1000) * 1000 || 1000;
    var plotW = Math.max(1,w-pad.l-pad.r), plotH = Math.max(1,h-pad.t-pad.b);
    ctx.font = "11px Arial"; ctx.textBaseline = "middle";
    for (var i=0;i<=4;i++) {
        var y = pad.t + plotH*(i/4);
        ctx.strokeStyle = "rgba(217,169,40,.13)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
        var val = max*(1-i/4);
        ctx.fillStyle="#9f916e"; ctx.textAlign="right";
        ctx.fillText(val >= 1000 ? "₹"+(val/1000).toFixed(val%1000===0?0:1)+"k" : "₹"+Math.round(val), pad.l-8,y);
    }
    var points=[];
    monthKeys.forEach(function(k,i){
        var x = monthKeys.length===1 ? pad.l+plotW/2 : pad.l + plotW*(i/(monthKeys.length-1));
        var y = pad.t + plotH*(1-values[i]/max);
        points.push([x,y]);
        ctx.fillStyle="#a99b78"; ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillText(vdDashboardMonthLabel(k,true),x,h-pad.b+11);
    });
    if (points.length) {
        var grad=ctx.createLinearGradient(0,pad.t,0,pad.t+plotH); grad.addColorStop(0,"rgba(217,169,40,.30)"); grad.addColorStop(1,"rgba(217,169,40,0)");
        ctx.beginPath(); ctx.moveTo(points[0][0],pad.t+plotH); points.forEach(function(p){ctx.lineTo(p[0],p[1]);}); ctx.lineTo(points[points.length-1][0],pad.t+plotH); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
        ctx.beginPath(); points.forEach(function(p,i){if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}); ctx.strokeStyle="#d9a928";ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
        points.forEach(function(p){ctx.beginPath();ctx.arc(p[0],p[1],4,0,Math.PI*2);ctx.fillStyle="#0b0905";ctx.fill();ctx.lineWidth=3;ctx.strokeStyle="#f4d47d";ctx.stroke();});
    }
    var total=values.reduce(function(a,b){return a+b;},0), totalEl=document.getElementById("vdTrendTotal"); if(totalEl) totalEl.textContent=money(total);
}

function vdGetMonthlyMoneyBreakdown(selectedMonth) {
    var data = getVdLiveDashboardData();
    var monthData = data[selectedMonth] || {};
    var principal = Number(monthData.loanAmount) || 0;
    var interest = Number(monthData.interest) || 0;
    var fee = Number(monthData.fee) || 0;
    var overdue = Number(monthData.overdue) || 0;
    var total = Number(monthData.total) || 0;
    if (!total) total = principal + interest + fee + overdue;
    var profit = Number(monthData.profit) || 0;
    if (!profit) profit = interest + fee + overdue;
    return { principal:principal, interest:interest, fee:fee, overdue:overdue, total:total, profit:profit };
}

function vdDrawMoneyPie(selectedMonth) {
    var canvas=document.getElementById("vdLoanStatusChart"); if(!canvas)return;
    var box=vdCanvasSize(canvas),ctx=box.ctx,w=box.width,h=box.height;ctx.clearRect(0,0,w,h);
    var values=vdGetMonthlyMoneyBreakdown(selectedMonth);
    var selector=document.getElementById("vdPieMetric");
    var metric=selector ? selector.value : "total";
    var labels=[], nums=[], title="Total Amount";

    if(metric==="profit") {
        title="Profit";
        labels=["Interest","Platform Fee","Overdue Money"];
        nums=[values.interest,values.fee,values.overdue];
    } else if(metric==="fee") {
        title="Platform Fee";
        labels=["Platform Fee","Other Profit"];
        nums=[values.fee,Math.max(0,values.profit-values.fee)];
    } else {
        title="Total Amount";
        labels=["Loan Amount","Interest","Platform Fee","Overdue Money"];
        nums=[values.principal,values.interest,values.fee,values.overdue];
    }

    var colors=["#f4d47d","#d9a928","#a87808","#6f5108"];
    var sum=nums.reduce(function(a,b){return a+(Number(b)||0);},0);
    var displayTotal = metric==="profit" ? values.profit : (metric==="fee" ? values.fee : values.total);
    var cx=w/2,cy=h/2,r=Math.min(w,h)*.44,inner=r*.62,start=-Math.PI/2;
    if(sum<=0){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.arc(cx,cy,inner,0,Math.PI*2,true);ctx.fillStyle="#2a2110";ctx.fill("evenodd");}
    else labels.forEach(function(k,i){var angle=((Number(nums[i])||0)/sum)*Math.PI*2;if(!angle)return;ctx.beginPath();ctx.arc(cx,cy,r,start,start+angle);ctx.arc(cx,cy,inner,start+angle,start,true);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();start+=angle;});

    var totalEl=document.getElementById("vdPieTotal");if(totalEl)totalEl.textContent=money(displayTotal);
    var centerLabel=document.getElementById("vdPieCenterLabel");if(centerLabel)centerLabel.textContent=title;
    var monthEl=document.getElementById("vdPieMonthLabel");if(monthEl)monthEl.textContent=vdDashboardMonthLabel(selectedMonth,false);
    var legend=document.getElementById("vdPieLegend");if(legend)legend.innerHTML=labels.map(function(k,i){return '<div class="vd-pie-legend-item"><span class="vd-pie-dot" style="background:'+colors[i%colors.length]+'"></span><span>'+k+'</span><strong>'+money(Number(nums[i])||0)+'</strong></div>';}).join("");
}

function vdfRtStatusKey(loan, app) { return String((loan && loan.status) || (app && app.status) || "").trim().toLowerCase(); }
function vdfRtIsCleared(status) { return status === "amount cleared" || status === "amount-cleared" || status === "cleared" || status === "paid"; }
function vdfRtLoanMonth(loan, app) {
    var raw=(loan&&loan.createdAt)||(app&&app.createdAt)||"", d=new Date(raw);
    if(isNaN(d.getTime())){var m=String(raw).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));}
    return isNaN(d.getTime()) ? "" : d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}
function vdfRtLoanOverdue(loan) {
    if(!loan) return 0;
    var st=vdfRtStatusKey(loan); if(vdfRtIsCleared(st)||st==="rejected"||st==="pending") return 0;
    if(typeof getVdfLiveOverdueInfo === "function") { try { var x=getVdfLiveOverdueInfo(loan); if(x) return Math.max(0,Number(x.amount||x.fee||x.overdueAmount||0)); } catch(e){} }
    return Math.max(0,Number(loan.overdueFeeAccrued||loan.overdueCharges||loan.overdueFee||0));
}
function vdfRtCurrentPayable(loan) {
    if(!loan) return 0; var st=vdfRtStatusKey(loan); if(vdfRtIsCleared(st)||st==="rejected") return 0;
    try { if(typeof vdfExactLoanPayable === "function") return Math.max(0,Number(vdfExactLoanPayable(loan))||0); } catch(e){}
    return Math.max(0,Number(loan.total||0));
}
function getVdfRealtimeDashboard(selectedMonth) {
    var allMode = String(selectedMonth || "ALL").toUpperCase() === "ALL";
    var out={principal:0,collected:0,outstanding:0,overdue:0,profit:0,active:0,cleared:0,payments:[],attention:[]};
    var globalActive=0;
    getLoans().forEach(function(app){ensureLoanHistory(app).forEach(function(loan,idx){
        var st=vdfRtStatusKey(loan,app);
        if(st==="approved"||st==="active") globalActive++;
        var inPeriod = allMode || vdfRtLoanMonth(loan,app)===selectedMonth;
        if(!inPeriod)return;
        if(st==="rejected"||st==="pending"||!st)return;
        var principal=Math.max(0,Number(loan.amount||0)), interest=Math.max(0,Number(loan.interest||0)), fee=Math.max(0,Number(loan.fee||0)), overdue=vdfRtLoanOverdue(loan);
        out.principal+=principal; out.overdue+=overdue;
        if(vdfRtIsCleared(st)){out.cleared++;var clearedPaid=Math.max(0,Number(loan.clearedAmount||loan.originalFullAmount||loan.originalTotal||loan.total||0));out.collected+=clearedPaid;out.profit+=interest+fee+Math.max(0,Number(loan.overdueFeeAccrued||loan.overdueCharges||0));}
        else if(st==="approved"||st==="active"){out.outstanding+=vdfRtCurrentPayable(loan);out.collected+=Math.max(0,Number(loan.amountPaid||loan.totalPaid||0));out.profit+=interest+fee+overdue;}
        var hist=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];
        hist.forEach(function(r){var paid=Math.max(0,Number(r.paidNow||r.amountPaid||r.paidAmount||r.paymentAmount||0));if(!paid)return;out.payments.push({name:app.name||"Customer",loan:idx+1,amount:paid,date:r.createdAt||r.date||r.updatedAt||""});});
    });});
    // Due & Overdue is LIVE and must NOT depend on the dashboard month filter.
    // Show only: overdue active loans, due today, or loans due within the next 5 calendar days.
    // Cleared/Paid/Pending/Rejected loans are excluded.
    getLoans().forEach(function(app){ensureLoanHistory(app).forEach(function(loan,idx){
        var st=vdfRtStatusKey(loan,app);
        if(st!=="approved" && st!=="active") return;
        if(vdfRtIsCleared(st)) return;
        var due=loan.repaymentDate||loan.dueDate||"";
        if(!due) return;
        var dd=null;
        var raw=String(due).trim();
        var iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        var dmy=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if(iso) dd=new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
        else if(dmy) dd=new Date(Number(dmy[3]),Number(dmy[2])-1,Number(dmy[1]));
        else { var parsed=new Date(raw); if(!isNaN(parsed.getTime())) dd=new Date(parsed.getFullYear(),parsed.getMonth(),parsed.getDate()); }
        if(!dd || isNaN(dd.getTime())) return;
        var today=new Date(); today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
        var days=Math.round((dd.getTime()-today.getTime())/86400000);
        if(days<0 || (days>=0 && days<=5)){
            out.attention.push({name:app.name||"Customer",loan:idx+1,days:days,payable:vdfRtCurrentPayable(loan),due:due});
        }
    });});
    // Active card/status must ALWAYS represent all currently active loans, even when a month is selected.
    out.active=globalActive;
    var overrides=vdfGetRealtimeDashboardOverrides();
    var key=allMode?"ALL":selectedMonth;
    if(overrides[key]) ["principal","collected","outstanding","overdue","profit","active","cleared"].forEach(function(k){
        if(overrides[key][k]!==undefined && overrides[key][k]!==null && overrides[key][k]!=="") out[k]=Math.max(0,Number(overrides[key][k])||0);
    });
    out.payments.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0)});out.attention.sort(function(a,b){return a.days-b.days});return out;
}

function vdfGetRealtimeDashboardOverrides(){try{return JSON.parse(localStorage.getItem("vdfRealtimeDashboardManual")||"{}");}catch(e){return {};}}
function vdfSaveRealtimeDashboardOverrides(x){localStorage.setItem("vdfRealtimeDashboardManual",JSON.stringify(x||{}));}
function openVdfRealtimeDashboardEditor(){
    if(sessionStorage.getItem("vdfAdmin")!=="true"){showPage("login");return;}
    var sel=document.getElementById("adminMonth"), key=sel&&sel.value?sel.value:"ALL", d=getVdfRealtimeDashboard(key);
    var old=document.getElementById("vdfRtDashboardEditModal");if(old)old.remove();
    var modal=document.createElement("div");modal.id="vdfRtDashboardEditModal";modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;";
    var fields=[["principal","Total Principal Given"],["collected","Total Collected"],["outstanding","Outstanding"],["overdue","Overdue Amount"],["profit","Profit"],["active","Active Loans (ALL)"],["cleared","Cleared Loans"]];
    modal.innerHTML='<div style="width:min(680px,100%);background:#0d0b07;border:1px solid #d9a928;border-radius:18px;padding:20px;color:#fff;box-shadow:0 20px 60px #000;">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px;"><div><h2 style="margin:0;color:#f4d47d;">✏️ Edit Dashboard</h2><small style="color:#aaa;">'+escapeHTML(vdDashboardMonthLabel(key,false))+' manual values</small></div><button type="button" class="btn btn-danger" onclick="document.getElementById(\'vdfRtDashboardEditModal\').remove()">✕</button></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">'+fields.map(function(f){return '<label style="display:block;color:#d9c88e;font-weight:700;">'+f[1]+'<input id="vdfRtEdit_'+f[0]+'" type="number" min="0" step="0.01" value="'+Number(d[f[0]]||0)+'" style="width:100%;margin-top:6px;padding:12px;border-radius:10px;border:1px solid #5d4914;background:#151108;color:#fff;box-sizing:border-box;"></label>';}).join('')+'</div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;"><button type="button" class="btn btn-primary" onclick="saveVdfRealtimeDashboardEditor()">Save Manual Values</button><button type="button" class="btn btn-danger" onclick="resetVdfRealtimeDashboardEditor()">Reset to Automatic</button></div></div>';
    document.body.appendChild(modal);
}
function saveVdfRealtimeDashboardEditor(){
    var sel=document.getElementById("adminMonth"),key=sel&&sel.value?sel.value:"ALL",o=vdfGetRealtimeDashboardOverrides(),x={};
    ["principal","collected","outstanding","overdue","profit","active","cleared"].forEach(function(k){var e=document.getElementById("vdfRtEdit_"+k);x[k]=Math.max(0,Number(e&&e.value)||0);});o[key]=x;vdfSaveRealtimeDashboardOverrides(o);
    var m=document.getElementById("vdfRtDashboardEditModal");if(m)m.remove();renderVdAdminAnalytics(key);
}
function resetVdfRealtimeDashboardEditor(){
    var sel=document.getElementById("adminMonth"),key=sel&&sel.value?sel.value:"ALL",o=vdfGetRealtimeDashboardOverrides();delete o[key];vdfSaveRealtimeDashboardOverrides(o);
    var m=document.getElementById("vdfRtDashboardEditModal");if(m)m.remove();renderVdAdminAnalytics(key);
}

function vdDrawRealtimeBars(d) {
    var c=document.getElementById("vdLoanTrendChart");if(!c)return;var box=vdCanvasSize(c),ctx=box.ctx,w=box.width,h=box.height;ctx.clearRect(0,0,w,h);
    var vals=[d.collected,d.outstanding],labs=["Collected","Outstanding"],max=Math.max(1,d.collected,d.outstanding),pad={l:55,r:25,t:25,b:45},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    for(var i=0;i<=4;i++){var y=pad.t+ph*i/4;ctx.strokeStyle="rgba(217,169,40,.13)";ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillStyle="#9f916e";ctx.font="11px Arial";ctx.textAlign="right";ctx.fillText("₹"+Math.round(max*(1-i/4)).toLocaleString("en-IN"),pad.l-7,y+3);}
    var bw=Math.min(120,pw/4);vals.forEach(function(v,i){var x=pad.l+pw*(i===0?.28:.72)-bw/2,bh=ph*(v/max),y=pad.t+ph-bh;var g=ctx.createLinearGradient(0,y,0,pad.t+ph);g.addColorStop(0,i===0?"#f4d47d":"#d9a928");g.addColorStop(1,"#6f5108");ctx.fillStyle=g;ctx.fillRect(x,y,bw,bh);ctx.fillStyle="#f3dfaa";ctx.textAlign="center";ctx.font="12px Arial";ctx.fillText(labs[i],x+bw/2,h-18);ctx.fillText(money(v),x+bw/2,Math.max(14,y-8));});
    var t=document.getElementById("vdTrendTotal");if(t)t.textContent=money(d.collected+d.outstanding);
}
function vdDrawRealtimeStatusPie(d, selectedMonth) {
    var c=document.getElementById("vdLoanStatusChart");if(!c)return;var box=vdCanvasSize(c),ctx=box.ctx,w=box.width,h=box.height;ctx.clearRect(0,0,w,h);var vals=[d.active,d.cleared],labs=["Active","Cleared"],cols=["#f4d47d","#8a6814"],sum=vals[0]+vals[1],cx=w/2,cy=h/2,r=Math.min(w,h)*.44,inner=r*.62,start=-Math.PI/2;
    if(sum<=0){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.arc(cx,cy,inner,0,Math.PI*2,true);ctx.fillStyle="#2a2110";ctx.fill("evenodd");}else vals.forEach(function(v,i){if(!v)return;var a=v/sum*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,start,start+a);ctx.arc(cx,cy,inner,start+a,start,true);ctx.closePath();ctx.fillStyle=cols[i];ctx.fill();start+=a;});
    var x=document.getElementById("vdPieTotal");if(x)x.textContent=String(sum);x=document.getElementById("vdPieCenterLabel");if(x)x.textContent="Loans";x=document.getElementById("vdPieMonthLabel");if(x)x.textContent=vdDashboardMonthLabel(selectedMonth,false);x=document.getElementById("vdPieLegend");if(x)x.innerHTML=labs.map(function(k,i){return '<div class="vd-pie-legend-item"><span class="vd-pie-dot" style="background:'+cols[i]+'"></span><span>'+k+'</span><strong>'+vals[i]+'</strong></div>';}).join("");
}
function renderVdAdminAnalytics(selectedMonth) {
    var d=getVdfRealtimeDashboard(selectedMonth), set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    set("vdRtPrincipal",money(d.principal));set("vdRtCollected",money(d.collected));set("vdRtOutstanding",money(d.outstanding));set("vdRtOverdue",money(d.overdue));set("vdRtProfit",money(d.profit));set("vdRtActive",String(d.active));set("vdRtCleared",String(d.cleared));
    vdDrawRealtimeBars(d);vdDrawRealtimeStatusPie(d,selectedMonth);
    var p=document.getElementById("vdRtRecentPayments");if(p)p.innerHTML=d.payments.slice(0,6).map(function(x){return '<div class="vd-rt-row"><div><b>'+escapeHTML(x.name)+' • Loan '+x.loan+'</b><small>'+escapeHTML(x.date?formatVdfDate(x.date):"Payment recorded")+'</small></div><strong>'+money(x.amount)+'</strong></div>';}).join("")||'<div class="vd-rt-empty">No payment records for this period.</div>';
    var a=document.getElementById("vdRtDueSummary");if(a)a.innerHTML=d.attention.map(function(x){var label=x.days<0?Math.abs(x.days)+' Days Overdue':x.days===0?'Due Today':'Due in '+x.days+' Day'+(x.days===1?'':'s');var dueText=x.due?formatVdfDate(x.due):'';return '<div class="vd-rt-row"><div><b>'+escapeHTML(x.name)+' • Loan '+x.loan+'</b><small>'+escapeHTML(label)+(dueText?' • Due: '+escapeHTML(dueText):'')+'</small></div><strong>'+money(x.payable)+'</strong></div>';}).join("")||'<div class="vd-rt-empty">No loans overdue or due within the next 5 days.</div>';
}

var vdAnalyticsResizeTimer=null;
window.addEventListener("resize",function(){clearTimeout(vdAnalyticsResizeTimer);vdAnalyticsResizeTimer=setTimeout(function(){var s=document.getElementById("adminMonth");if(s&&s.value&&document.getElementById("admin")&&document.getElementById("admin").classList.contains("active"))renderVdAdminAnalytics(s.value);},120);});


/* ================= CHANGE STATUS ================= */

function changeApplicationStatus(id, loanIndex, newStatus) {

    /* First click must always execute. The action is locked by application/loan
       rather than by the whole Admin page, so a slow backend never makes the
       admin click the same button repeatedly. */
    var actionKey = String(id) + "::" + String(loanIndex) + "::" + String(newStatus);
    window.vdfPendingAdminActions = window.vdfPendingAdminActions || {};
    if (window.vdfPendingAdminActions[actionKey]) return;
    window.vdfPendingAdminActions[actionKey] = true;
    vdfAdminActionBusy = true;

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
        showPage("login");
        return;
    }

    var loans = getLoans();

    var index = loans.findIndex(function(item) {
        return String(item.id) === String(id);
    });

    if (index === -1) {
        alert("Application not found.");
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
        return;
    }

    var application = loans[index];
    var history = ensureLoanHistory(application);

    if (!history[loanIndex]) {
        alert("Loan transaction not found.");
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
        return;
    }

    history[loanIndex].status = newStatus;

    /* Queue a one-time customer popup for this status change. It is shown
       automatically when the customer next opens Status Check and disappears
       after the customer closes the popup. */
    application.statusPopup =
        "Loan " + (loanIndex + 1) + " has been " + newStatus + ".";

    application.loanHistory = history;

    var latest = history[history.length - 1];
    application.status = latest.status;
    application.amount = latest.amount;
    application.period = latest.period;
    application.interest = latest.interest;
    application.fee = latest.fee;
    application.total = latest.total;
    application.repaymentDate = latest.repaymentDate;

    application.userAccess = history.some(function(loan) {
        return loan.status !== "Amount Cleared";
    });

    saveLoans(loans);

    /* Dashboard is event-based: Approved records the loan figures;
       Rejected/Pending do nothing; Amount Cleared records profit. */
    recordDashboardStatusChange(history[loanIndex], newStatus);

    var backendWrite;
    try {
        backendWrite = syncToGoogleSheet("update", application);

        /* Automatic customer email for Approved / Rejected. */
        sendAutomaticStatusEmail(application, loanIndex, newStatus);

        /* Render the result immediately. Never fetch/replace the row during the action. */
        loadAdminApplications(true);
    } catch (error) {
        console.error("VDF admin status action failed:", error);
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
        alert("Action could not be completed. Please try again.");
        return;
    }

    /* no-cors POST resolves when the browser sends the request, not when
       Google Apps Script has finished updating the Sheet. Keep the admin
       action locked until the server really contains the new status. */
    verifyAdminStatusSync(application, loanIndex, newStatus, 0);
}

function verifyAdminStatusSync(application, loanIndex, expectedStatus, attempt) {
    var maxAttempts = 8;
    var delay = 800;

    if (!application || !application.id) {
        vdfAdminActionBusy = false;
        return;
    }

    fetchSharedApplicationById(application.id).then(function(serverApplication) {
        var history = serverApplication ? ensureLoanHistory(serverApplication) : [];
        var serverLoan = history[loanIndex];
        var matches = serverLoan &&
            String(serverLoan.status || '').trim().toLowerCase() ===
            String(expectedStatus || '').trim().toLowerCase();

        if (matches) {
            /* Pull the complete backend list so Status/Admin/History/Statement all lose deleted records immediately. */
            fetchSharedApplications().then(function(){
                if (typeof loadAdminApplications === "function") loadAdminApplications(false);
            });
            vdfAdminActionBusy = false;
            delete window.vdfPendingAdminActions[String(application.id) + "::" + String(loanIndex) + "::" + String(expectedStatus)];
            return;
        }

        if (attempt >= maxAttempts) {
            /* Keep the local result visible; the next normal refresh can retry. */
            vdfAdminActionBusy = false;
            console.warn('Admin status sync verification timed out for', application.id);
            delete window.vdfPendingAdminActions[String(application.id) + "::" + String(loanIndex) + "::" + String(expectedStatus)];
            return;
        }

        /* Re-send the update before checking again. This handles slow Apps
           Script/Google Sheet writes without asking the admin to click again. */
        syncToGoogleSheet('update', application);
        setTimeout(function() {
            verifyAdminStatusSync(application, loanIndex, expectedStatus, attempt + 1);
        }, delay);
    }).catch(function(error) {
        if (attempt >= maxAttempts) {
            vdfAdminActionBusy = false;
            console.warn('Admin status verification failed:', error);
            return;
        }
        setTimeout(function() {
            verifyAdminStatusSync(application, loanIndex, expectedStatus, attempt + 1);
        }, delay);
    });
}


/* ================= CHOOSE LOAN FOR APPROVE / REJECT ================= */

function openVdLoanSelector(title, history, onSelect) {
    var oldModal = document.getElementById("vdfLoanActionSelector");
    if (oldModal) oldModal.remove();

    var modal = document.createElement("div");
    modal.id = "vdfLoanActionSelector";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:100000;padding:18px;";

    var box = document.createElement("div");
    box.style.cssText = "width:min(430px,100%);background:#0d0d0d;border:1px solid #d4af37;border-radius:18px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.55);color:#fff;";
    box.innerHTML = '<div style="font-size:20px;font-weight:900;color:#d4af37;margin-bottom:6px;">' + escapeHTML(title) + '</div>' +
        '<div style="font-size:13px;color:#bbb;margin-bottom:15px;">Select the exact loan. Only the selected loan will be changed.</div>';

    history.forEach(function(loan, index) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = "width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:9px 0;padding:13px 14px;border-radius:12px;border:1px solid rgba(212,175,55,.45);background:#171717;color:#fff;font-weight:800;cursor:pointer;";
        btn.innerHTML = '<span>Loan ' + (index + 1) + '</span><span style="font-size:12px;color:#d4af37;text-align:right;">' + money(loan.amount) + ' • ' + escapeHTML(loan.status || "Pending") + '</span>';
        btn.onclick = function() { modal.remove(); onSelect(index); };
        box.appendChild(btn);
    });

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = "width:100%;margin-top:10px;padding:11px;border-radius:12px;border:1px solid #444;background:#222;color:#ddd;font-weight:800;cursor:pointer;";
    cancel.onclick = function() { modal.remove(); };
    box.appendChild(cancel);
    modal.appendChild(box);
    modal.addEventListener("click", function(e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function chooseLoanForStatus(id, newStatus, directLoanIndex) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }

    var loans = getLoans();
    var application = loans.find(function(item) { return String(item.id) === String(id); });
    if (!application) { alert("Application not found."); return; }

    var history = ensureLoanHistory(application);
    if (!history.length) { alert("No loan transactions found."); return; }

    /* Admin table already represents one exact loan. Act on that loan on the
       first click instead of opening a second loan selector. Other callers
       that do not supply an index still get the normal selector. */
    if (Number.isInteger(Number(directLoanIndex)) && Number(directLoanIndex) >= 0 && Number(directLoanIndex) < history.length) {
        changeApplicationStatus(id, Number(directLoanIndex), newStatus);
        return;
    }

    var actionText = newStatus === "Approved" ? "Approve Loan" : "Reject Loan";
    openVdLoanSelector(actionText, history, function(loanIndex) {
        changeApplicationStatus(id, loanIndex, newStatus);
    });
}

function getVdLoanRisk(score) {
    score = Math.max(0, Math.min(100, Number(score) || 0));
    if (score >= 80) return { key: "excellent", label: "Excellent" };
    if (score >= 60) return { key: "good", label: "Good" };
    if (score >= 40) return { key: "average", label: "Average" };
    return { key: "risk", label: "Risk" };
}

/* VD internal Loan Score — calculated automatically from repayment dates.
   Approved + not overdue: 100.
   Every overdue day reduces 5 points (minimum 0).
   Once cleared, the score is frozen using clearedAt versus the due date.
   Pending / Rejected and legacy cleared loans without a cleared date show N/A. */
function parseVdDateOnly(value) {
    if (!value) return null;
    var text = String(value).trim();
    var dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    var d;
    if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    else d = new Date(text);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function getVdAutomaticLoanScore(loan) {
    if (!loan) return { available: false, score: null };
    var status = String(loan.status || "").trim().toLowerCase();
    if (status === "pending" || status === "rejected") return { available: false, score: null };

    var due = parseVdDateOnly(loan.repaymentDate || getRepaymentDateFromCreatedAt(loan.createdAt, loan.period));
    if (!due) return { available: false, score: null };

    var reference;
    var isCleared = status === "amount cleared" || status === "amount-cleared" || status === "cleared";
    if (isCleared) {
        reference = parseVdDateOnly(loan.clearedAt);
        if (!reference) return { available: false, score: null };
    } else if (status === "approved") {
        reference = new Date();
        reference.setHours(0, 0, 0, 0);
    } else {
        return { available: false, score: null };
    }

    var lateDays = Math.max(0, Math.floor((reference - due) / 86400000));
    var score = Math.max(0, 100 - (lateDays * 5));
    return { available: true, score: score, lateDays: lateDays };
}

/* ================= CHOOSE LOAN TO CLEAR ================= */

function chooseLoanForClear(id, directLoanIndex) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var application = loans.find(function(item) {
        return String(item.id) === String(id);
    });

    if (!application) {
        alert("Application not found.");
        return;
    }

    var history = ensureLoanHistory(application);
    if (!history.length) { alert("No loan transactions found."); return; }

    /* From an exact Admin loan row, clear that loan immediately on the first
       click. Keep the selector for toolbar/other flows where no index exists. */
    if (Number.isInteger(Number(directLoanIndex)) && Number(directLoanIndex) >= 0 && Number(directLoanIndex) < history.length) {
        clearLoanAmount(id, Number(directLoanIndex));
        return;
    }

    openVdLoanSelector("Amount Clear", history, function(loanIndex) {
        clearLoanAmount(id, loanIndex);
    });
}


/* ================= CLEAR LOAN AMOUNT ================= */

function clearLoanAmount(id, loanIndex) {

    var actionKey = String(id) + "::" + String(loanIndex) + "::Amount Cleared";
    window.vdfPendingAdminActions = window.vdfPendingAdminActions || {};
    if (window.vdfPendingAdminActions[actionKey]) return;

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var index = loans.findIndex(function(item) {
        return String(item.id) === String(id);
    });

    if (index === -1) {
        alert("Application not found.");
        return;
    }

    var application = loans[index];
    var history = ensureLoanHistory(application);

    if (!history[loanIndex]) {
        alert("Loan transaction not found.");
        return;
    }

    if (!confirm("Are you sure Loan " + (loanIndex + 1) + " amount is cleared?")) {
        return;
    }

    window.vdfPendingAdminActions[actionKey] = true;
    vdfAdminActionBusy = true;

    /* Snapshot the exact amount that was payable at clearance. This is used by
       the statement as historical paid value; pending balance becomes zero. */
    history[loanIndex].clearedAmount = vdfExactLoanPayable(history[loanIndex]);
    vdfAddPaymentLedgerRecord(application,history[loanIndex],loanIndex,{id:'CLR-'+String(id)+'-'+String(loanIndex)+'-'+String(Date.now()),date:new Date().toISOString(),type:'Full Clearance',previousBalance:history[loanIndex].clearedAmount,amountPaid:history[loanIndex].clearedAmount,newBalance:0,paymentMode:'Admin Amount Clear'});
    history[loanIndex].status = "Amount Cleared";
    /* Freeze the automatic score using the actual day Admin marks this loan cleared. */
    history[loanIndex].clearedAt = new Date().toISOString();

    /* Queue a one-time customer popup for the cleared loan. */
    application.statusPopup =
        "Loan " + (loanIndex + 1) + " has been Amount Cleared.";

    application.loanHistory = history;

    application.userAccess = history.some(function(loan) {
        return loan.status !== "Amount Cleared";
    });

    var latest = history[history.length - 1];
    application.status = latest.status;
    application.amount = latest.amount;
    application.period = latest.period;
    application.interest = latest.interest;
    application.fee = latest.fee;
    application.total = latest.total;
    application.repaymentDate = latest.repaymentDate;

    saveLoans(loans);

    /* Amount Cleared records only the profit. The loan amount was already
       recorded when Admin approved this loan. Nothing is ever subtracted. */
    recordDashboardStatusChange(history[loanIndex], "Amount Cleared");

    var backendWrite;
    try {
        backendWrite = syncToGoogleSheet("update", application);

        /* Automatic customer email for Amount Cleared. */
        sendAutomaticStatusEmail(application, loanIndex, "Amount Cleared");

        loadAdminApplications(false);
    } catch (error) {
        console.error("VDF clear action failed:", error);
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
        alert("Amount Cleared action could not be completed. Please try again.");
        return;
    }

    verifyAdminStatusSync(application, loanIndex, "Amount Cleared", 0);

    alert("Loan " + (loanIndex + 1) + " marked as Amount Cleared. Other loans remain active.");
}


/* ================= CHOOSE LOAN TO DELETE ================= */

function chooseLoanForDelete(id, selectedLoanIndex) {

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();
    var application = loans.find(function(item) {
        return String(item.id) === String(id);
    });

    if (!application) {
        alert("Application not found.");
        return;
    }

    var history = ensureLoanHistory(application);
    var loanIndex = Number.isInteger(Number(selectedLoanIndex)) && Number(selectedLoanIndex) >= 0
        ? Number(selectedLoanIndex)
        : 0;

    if (history.length > 1 && !(Number.isInteger(Number(selectedLoanIndex)) && Number(selectedLoanIndex) >= 0)) {
        var loanOptions = history.map(function(loan, index) {
            return "Loan " + (index + 1) + " - " + money(loan.amount) + " - " + (loan.status || "Pending");
        }).join("\n");

        var choice = prompt("Which loan do you want to delete? Enter Loan Number (1, 2, 3...):\n\n" + loanOptions);
        if (choice === null) return;
        loanIndex = Number(choice.trim()) - 1;
    }

    if (!Number.isInteger(loanIndex) || loanIndex < 0 || loanIndex >= history.length) {
        alert("Please enter a valid loan number.");
        return;
    }

    deleteLoanTransaction(id, loanIndex);
}


/* ================= DELETE INDIVIDUAL CLEARED LOAN ================= */

function deleteLoanTransaction(id, loanIndex) {
    var actionKey = String(id) + "::DELETE::" + String(loanIndex);
    window.vdfPendingAdminActions = window.vdfPendingAdminActions || {};
    if (window.vdfPendingAdminActions[actionKey]) return;
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }

    var loans = getLoans();
    var appIndex = loans.findIndex(function(item) { return String(item.id) === String(id); });
    if (appIndex < 0) { alert("Application not found."); return; }
    var application = loans[appIndex];
    var history = ensureLoanHistory(application);
    if (!history[loanIndex]) { alert("Loan transaction not found."); return; }
    if (!confirm("Permanently delete Loan " + (loanIndex + 1) + "?\n\nIt will be removed from Database, Status, History and Statement.")) return;

    window.vdfPendingAdminActions[actionKey] = true;
    vdfAdminActionBusy = true;

    // Server first. Do not remove locally unless the database confirms deletion.
    deleteExactLoanFromGoogleSheet(id, loanIndex).then(function(result) {
        if (result.applicationDeleted) {
            loans.splice(appIndex, 1);
        } else {
            var serverHistory = Array.isArray(result.loanHistory) ? result.loanHistory : [];
            application.loanHistory = serverHistory;
            if (serverHistory.length) {
                var latest = serverHistory[serverHistory.length - 1];
                application.amount = latest.amount;
                application.period = latest.period;
                application.interest = latest.interest;
                application.fee = latest.fee;
                application.total = latest.total;
                application.repaymentDate = latest.repaymentDate;
                application.status = latest.status;
                application.userAccess = serverHistory.some(function(loan) {
                    return String(loan.status || '').toLowerCase() !== 'amount cleared' &&
                           String(loan.status || '').toLowerCase() !== 'cleared' &&
                           String(loan.status || '').toLowerCase() !== 'paid';
                });
            }
        }
        saveLoans(loans);
        // Pull server truth again so deleted loans can never be reintroduced by local cache.
        return fetchSharedApplications().catch(function(){ return null; });
    }).then(function() {
        loadAdminApplications(true);
        alert("Loan permanently deleted from database.");
    }).catch(function(error) {
        console.error('Permanent loan delete failed:', error);
        alert("Delete failed in database. Nothing was removed locally. Please try again.");
    }).finally(function() {
        vdfAdminActionBusy = false;
        delete window.vdfPendingAdminActions[actionKey];
    });
}

function verifyAdminDeleteSync(id, expectApplicationGone, expectedHistoryLength, attempt, actionKey) {
    var maxAttempts = 8;
    var delay = 800;

    fetchSharedApplicationById(id).then(function(serverApplication) {
        var historyLength = serverApplication && Array.isArray(serverApplication.loanHistory)
            ? serverApplication.loanHistory.length
            : (serverApplication ? 1 : 0);

        var matches = expectApplicationGone
            ? !serverApplication
            : !!serverApplication && historyLength === Number(expectedHistoryLength);

        if (matches) {
            vdfAdminActionBusy = false;
            delete window.vdfPendingAdminActions[actionKey];
            return;
        }

        if (attempt >= maxAttempts) {
            vdfAdminActionBusy = false;
            console.warn('Admin delete sync verification timed out for', id);
            delete window.vdfPendingAdminActions[actionKey];
            return;
        }

        /* The initial no-cors request may still be processing. Re-send the
           exact local state/delete after a short delay instead of requiring
           repeated manual clicks. */
        var localLoans = getLoans();
        var localApplication = localLoans.find(function(item) {
            return String(item.id || '').trim().toUpperCase() === String(id || '').trim().toUpperCase();
        });

        if (expectApplicationGone) {
            if (localApplication) syncToGoogleSheet('delete', localApplication);
        } else if (localApplication) {
            syncToGoogleSheet('authoritativeUpdate', localApplication);
        }

        setTimeout(function() {
            verifyAdminDeleteSync(id, expectApplicationGone, expectedHistoryLength, attempt + 1, actionKey);
        }, delay);
    }).catch(function(error) {
        if (attempt >= maxAttempts) {
            vdfAdminActionBusy = false;
            console.warn('Admin delete verification failed:', error);
            delete window.vdfPendingAdminActions[actionKey];
            return;
        }
        setTimeout(function() {
            verifyAdminDeleteSync(id, expectApplicationGone, expectedHistoryLength, attempt + 1, actionKey);
        }, delay);
    });
}


/* ================= DELETE CLEARED APPLICATION ================= */

function deleteClearedApplication(id) {

    var actionKey = String(id) + "::DELETE_CUSTOMER";
    window.vdfPendingAdminActions = window.vdfPendingAdminActions || {};
    if (window.vdfPendingAdminActions[actionKey]) return;

    if (sessionStorage.getItem("vdfAdmin") !== "true") {
        showPage("login");
        return;
    }

    var loans = getLoans();

    var index = loans.findIndex(function(item) {
        return String(item.id) === String(id);
    });

    if (index === -1) {
        alert("Application not found.");
        return;
    }

    var application = loans[index];
    var history = ensureLoanHistory(application);

    var allCleared = history.every(function(loan) {
        return loan.status === "Amount Cleared";
    });

    if (!allCleared) {
        alert("The complete application can be deleted only after all loans are Amount Cleared.");
        return;
    }

    if (!confirm("Delete this customer's complete loan history permanently?")) {
        return;
    }

    /* Delete Customer is local-first and must respond to the first click. */
    window.vdfPendingAdminActions[actionKey] = true;
    vdfAdminActionBusy = true;

    loans.splice(index, 1);
    saveLoans(loans);
    var deleteWrite = syncToGoogleSheet("delete", application);
    loadAdminApplications(true);
    verifyAdminDeleteSync(application.id, true, 0, 0, actionKey);
}


/* ================= ADMIN LOGOUT ================= */

function adminLogout() {

    sessionStorage.removeItem("vdfAdmin");

    showPage("home");

}


/* ================= CHATBOT ================= */

function toggleChat() {
    var chat = document.getElementById("chatBox");
    if (!chat) return;
    var isOpen = window.getComputedStyle(chat).display !== "none";
    if (isOpen) { closeChat(); return; }
    chat.style.display = "flex";
    var messages = document.getElementById("messages");
    if (!messages || messages.children.length === 0) showCustomerTypeOptions();
    setTimeout(function(){ var input=document.getElementById("chatInput"); if(input) input.focus(); },50);
}
function closeChat(){
    var chat=document.getElementById("chatBox");
    if(chat) chat.style.display="none";
}

function clearChatOptions() {
    var options = document.getElementById("chatOptions");
    if (options) options.innerHTML = "";
}

function addChatOption(label, value, extraClass) {
    var options = document.getElementById("chatOptions");
    if (!options) return;

    var button = document.createElement("button");
    button.type = "button";
    button.className = "chat-option" + (extraClass ? " " + extraClass : "");
    button.textContent = label;
    button.onclick = function() { handleChatOption(value, label); };
    options.appendChild(button);
}

function showCustomerTypeOptions() {
    vdChatAwaiting = null;
    var messages = document.getElementById("messages");
    if (messages && messages.children.length === 0) {
        addChatMessage("Hello! 👋 How can I help you?", "bot");
    } else if (messages) {
        messages.innerHTML = "";
        addChatMessage("Hello! 👋 Are you a new customer or an existing customer?", "bot");
    }

    clearChatOptions();
    addChatOption("New Customer", "new_customer");
    addChatOption("Existing Customer", "existing_customer");
}

function showNewCustomerOptions(announce) {
    if (announce !== false) addChatMessage("Great! I can help you with a new loan application. Please select what you need:", "bot");
    clearChatOptions();
    addChatOption("Loan Amount", "new_amount");
    addChatOption("Calculate Loan", "new_calculate");
    addChatOption("Apply Loan", "new_apply");
    addChatOption("Loan Period", "new_period");
    addChatOption("Platform Fee", "new_fee");
    addChatOption("⬅ Back", "back");
}

function showExistingCustomerOptions() {
    addChatMessage("Welcome back! Please select what you need help with:", "bot");
    clearChatOptions();
    addChatOption("Check Status", "existing_status");
    addChatOption("Due Date / Repayment", "existing_due");
    addChatOption("Loan Details", "existing_details");
    addChatOption("Loan History", "existing_history");
    addChatOption("⬅ Back", "back");
}

var vdChatAwaiting = null;

function vdChatMoney(value) {
    return "₹" + (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function vdChatIsActiveLoan(loan) {
    var status = String((loan && loan.status) || "").trim().toLowerCase();
    return status === "approved" || status === "active";
}

function vdChatFindCustomers(query, allowId) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return Promise.resolve([]);
    return fetchSharedApplications().then(function(shared) {
        var list = Array.isArray(shared) ? shared : getLoans();
        return list.filter(function(a) {
            var id = String(a.id || "").trim().toLowerCase();
            var name = String(a.name || "").trim().toLowerCase();
            return (allowId && id === q) || name === q;
        });
    });
}

function vdChatShowLoanDetails(query) {
    addChatMessage("Checking your loan details...", "bot");
    vdChatFindCustomers(query, false).then(function(matches) {
        if (!matches.length) {
            addChatMessage("No customer found with that name. Please check the name and try again.", "bot");
            vdChatAwaiting = "loan_details_name";
            return;
        }
        if (matches.length > 1) {
            addChatMessage("More than one customer has this name. For privacy, please use Loan History and enter your VD ID.", "bot");
            vdChatAwaiting = null;
            showExistingCustomerOptions(false);
            return;
        }
        var a = matches[0];
        var history = ensureLoanHistory(a);
        var active = history.filter(vdChatIsActiveLoan);
        var totalPayable = active.reduce(function(sum, loan) { return sum + (Number(loan.total) || 0); }, 0);
        if (!active.length) {
            addChatMessage("VD ID: " + (a.id || "-") + "\nNo active loan is available right now.", "bot");
        } else {
            addChatMessage("VD ID: " + (a.id || "-") + "\nTotal Payable: " + vdChatMoney(totalPayable), "bot");
        }
        vdChatAwaiting = null;
        showExistingCustomerOptions(false);
    });
}

function vdChatShowLoanHistory(query) {
    addChatMessage("Checking your active loans...", "bot");
    vdChatFindCustomers(query, true).then(function(matches) {
        if (!matches.length) {
            addChatMessage("No customer found. Please enter the correct VD ID or full name.", "bot");
            vdChatAwaiting = "loan_history_lookup";
            return;
        }
        if (matches.length > 1) {
            addChatMessage("More than one customer has this name. Please enter your VD ID to view the correct loan history.", "bot");
            vdChatAwaiting = "loan_history_lookup";
            return;
        }
        var a = matches[0];
        var history = ensureLoanHistory(a);
        var active = history.filter(vdChatIsActiveLoan);
        if (!active.length) {
            addChatMessage("VD ID: " + (a.id || "-") + "\nNo active loans found.", "bot");
        } else {
            var lines = ["VD ID: " + (a.id || "-"), "Active Loans: " + active.length];
            active.forEach(function(loan, index) {
                lines.push("", "Loan " + (loan.loanNumber || (index + 1)),
                    "Amount: " + vdChatMoney(loan.amount),
                    "Total Payable: " + vdChatMoney(loan.total),
                    "Due Date: " + (loan.repaymentDate || "-"),
                    "Status: Active");
            });
            addChatMessage(lines.join("\n"), "bot");
        }
        vdChatAwaiting = null;
        showExistingCustomerOptions(false);
    });
}

function handleChatOption(value, label) {
    if (value === "new_customer") {
        addChatMessage(label, "user");
        showNewCustomerOptions(true);
        return;
    }

    if (value === "existing_customer") {
        addChatMessage(label, "user");
        showExistingCustomerOptions();
        return;
    }

    if (value === "back") {
        showCustomerTypeOptions();
        return;
    }

    addChatMessage(label, "user");
    clearChatOptions();

    var reply = "";

    if (value === "new_amount") {
        reply = "VD Finance loan amount is from ₹100 to ₹50,000.";
    } else if (value === "new_calculate") {
        reply = "Please use the Calculator to calculate your loan amount, interest and total payable.";
        setTimeout(function() { showPage("calculator"); }, 350);
    } else if (value === "new_apply") {
        reply = "Opening the Apply Loan page. Please enter your details and submit the application.";
        setTimeout(function() { showPage("apply"); }, 350);
    } else if (value === "new_period") {
        reply = "The available loan period is fixed at 30 days.";
    } else if (value === "new_fee") {
        reply = "The platform fee is a fixed ₹100.";
    } else if (value === "existing_status") {
        reply = "Opening Status. Enter your application ID to check your current loan status.";
        setTimeout(function() { showPage("status"); }, 350);
    } else if (value === "existing_due") {
        reply = "Opening Status. After entering your application ID, you can see your repayment date and due date.";
        setTimeout(function() { showPage("status"); }, 350);
    } else if (value === "existing_details") {
        vdChatAwaiting = "loan_details_name";
        addChatMessage("Please enter your Name.", "bot");
        return;
    } else if (value === "existing_history") {
        vdChatAwaiting = "loan_history_lookup";
        addChatMessage("Please enter your VD ID or Name.", "bot");
        return;
    }

    addChatMessage(reply, "bot");

    setTimeout(function() {
        if (value.indexOf("new_") === 0) {
            showNewCustomerOptions(false);
        } else if (value.indexOf("existing_") === 0) {
            showExistingCustomerOptions(false);
        }
    }, 500);
}

function sendChat() {

    var input = document.getElementById("chatInput");
    var text = input.value.trim();

    if (!text) return;

    addChatMessage(text, "user");
    input.value = "";
    clearChatOptions();

    if (vdChatAwaiting === "loan_details_name") {
        vdChatShowLoanDetails(text);
        return;
    }
    if (vdChatAwaiting === "loan_history_lookup") {
        vdChatShowLoanHistory(text);
        return;
    }

    setTimeout(function() {
        addChatMessage(getBotReply(text), "bot");
        clearChatOptions();
        addChatOption("New Customer", "new_customer");
        addChatOption("Existing Customer", "existing_customer");
    }, 250);

}

function sendChatOption(option) {
    handleChatOption(option.toLowerCase().replace(/\s+/g, "_"), option);
}


function addChatMessage(text, type) {

    var messages = document.getElementById("messages");

    var div = document.createElement("div");

    div.className = "message " + type;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}


function getBotReply(text) {

    var message = text.toLowerCase();

    if (
        message.includes("loan amount") ||
        message.includes("amount") ||
        message.includes("how much")
    ) {
        return "VD Finance loan amount is from ₹100 to ₹50,000.";
    }

    if (
        message.includes("interest") ||
        message.includes("rate")
    ) {
        return "Please use Calculate Loan to check the interest amount.";
    }

    if (
        message.includes("fee") ||
        message.includes("platform")
    ) {
        return "The platform fee used in the calculator is a fixed ₹100.";
    }

    if (
        message.includes("period") ||
        message.includes("days")
    ) {
        return "Available loan period is 30 days.";
    }

    if (
        message.includes("apply") ||
        message.includes("application")
    ) {
        return "Go to the Apply Loan section, enter your details and submit the application.";
    }

    if (
        message.includes("status") ||
        message.includes("track")
    ) {
        return "Use the Application Status section and enter your VDF application ID.";
    }

    if (
        message.includes("hello") ||
        message.includes("hi")
    ) {
        return "Hello! 👋 Welcome to VD Finance. How can I help you?";
    }

    return "I can help with loan amount, interest, platform fee, loan period, application and application status.";
}


/* ================= SECURITY HELP ================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function toggleHomeMenu() {
    var menu = document.getElementById("homeNavLinks");
    var toggle = document.querySelector(".vdf-home-menu");
    if (!menu || !toggle) return;

    var isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeHomeMenu() {
    var menu = document.getElementById("homeNavLinks");
    var toggle = document.querySelector(".vdf-home-menu");
    if (menu) menu.classList.remove("open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
}

/* ================= BUTTON HANDLERS ================= */
/*
   No global click interception. Every button receives its normal browser
   click event immediately. Action functions themselves handle their own
   confirmation and duplicate-action protection.
*/

/* ================= INITIAL LOAD ================= */


/* ================= HOME FESTIVAL GREETING =================
   Major Telugu/Indian festival dates can be extended here year by year.
   The banner is hidden on normal days. */
function initVDFFestivalGreeting() {
    var banner = document.getElementById("vdfFestivalBanner");
    if (!banner) return;

    var now = new Date();
    var key = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    var festivals = {
        "2026-01-14": {title:"Happy Bhogi", deity:"surya", effect:"bhogi", message:"May this Bhogi bring fresh beginnings, happiness and prosperity to your family."},
        "2026-01-15": {title:"Happy Sankranti", deity:"surya", effect:"sankranti", message:"Wishing you and your family a joyful Sankranti filled with prosperity and bright new beginnings."},
        "2026-02-15": {title:"Happy Maha Shivaratri", deity:"shiva", effect:"shiva", message:"May Lord Shiva bless your home with strength, peace and prosperity."},
        "2026-03-04": {title:"Happy Holi", deity:"krishna", effect:"holi", message:"Wishing you a joyful Holi filled with bright colours, happiness and beautiful moments."},
        "2026-03-19": {title:"Happy Ugadi", deity:"kalash", effect:"ugadi", message:"May this Telugu New Year bring happiness, success and prosperity to you and your family."},
        "2026-03-27": {title:"Happy Sri Rama Navami", deity:"rama", effect:"rama", message:"May Lord Rama bless you with courage, peace and a prosperous path ahead."},
        "2026-09-04": {title:"Happy Sri Krishna Janmashtami", deity:"krishna", effect:"krishna", message:"May Lord Krishna fill your life with joy, wisdom and abundance."},
        "2026-09-14": {title:"Happy Vinayaka Chavithi", deity:"ganesha", effect:"ganesha", message:"May Lord Ganesha remove obstacles and bless every new beginning with success."},
        "2026-10-19": {title:"Happy Durga Ashtami", deity:"durga", effect:"dasara", message:"May Goddess Durga bless you and your family with courage, protection and prosperity."},
        "2026-10-20": {title:"Happy Vijaya Dasami", deity:"durga", effect:"dasara", message:"May this Vijaya Dasami bring victory, courage, happiness and prosperity to every new beginning."},
        "2026-10-28": {title:"Happy Atla Tadde", deity:"moon", effect:"default", message:"Warm wishes on Atla Tadde. May your family be blessed with happiness, health and prosperity."},
        "2026-11-08": {title:"Happy Deepavali", deity:"lakshmi", effect:"diwali", message:"May Goddess Lakshmi bless your home with light, happiness and prosperity this Deepavali."},
        "2026-11-13": {title:"Happy Nagula Chavithi", deity:"naga", effect:"naga", message:"Warm wishes to you and your family on the auspicious occasion of Nagula Chavithi."},
        "2026-12-15": {title:"Happy Subrahmanya Shashti", deity:"subrahmanya", effect:"subrahmanya", message:"May Lord Subrahmanya bless you and your family with courage, health, protection and prosperity."},
        "2026-12-25": {title:"Merry Christmas", deity:"star", effect:"christmas", message:"Wishing you and your family a joyful Christmas filled with peace, happiness and bright new beginnings."}
    };

    var festival = festivals[key];
    if (!festival) {
        banner.classList.remove("show");
        return;
    }

    var title = document.getElementById("vdfFestivalTitle");
    var message = document.getElementById("vdfFestivalMessage");
    var art = document.getElementById("vdfFestivalArt");
    if (title) title.textContent = festival.title;
    if (message) message.textContent = festival.message;
    if (art) art.innerHTML = getVDFFestivalArt(festival.deity);
    banner.classList.add("show");
    launchVDFFestivalEffects(festival.effect || "default");
}

function launchVDFFestivalEffects(type) {
    if (document.getElementById("vdfFestivalEffects")) return;
    var layer = document.createElement("div");
    layer.id = "vdfFestivalEffects";
    layer.className = "vdf-festival-effects";
    document.body.appendChild(layer);

    function item(content, cls, left, top, size, delay, dur) {
        var el = document.createElement("i");
        el.className = "vdf-fx-item " + cls;
        el.textContent = content || "";
        el.style.left = left + "vw";
        if (top !== null) el.style.top = top + "vh";
        el.style.fontSize = size + "px";
        el.style.animationDelay = delay + "s";
        el.style.setProperty("--dur", dur + "s");
        el.style.setProperty("--drift", (-90 + Math.random()*180) + "px");
        el.style.setProperty("--spin", (-600 + Math.random()*1200) + "deg");
        layer.appendChild(el);
        return el;
    }

    var i, el, colors = ["#ff3b30","#ffcc00","#34c759","#00b7ff","#af52de","#ff7a00","#ff4fa3"];
    if (type === "dasara") {
        for (i=0;i<12;i++) item("🔱","vdf-fx-fall vdf-trishul",Math.random()*100,null,20+Math.random()*16,Math.random()*1.8,8+Math.random()*4);
        for (i=0;i<10;i++) item(i%2===0?"▰":"▱","vdf-fx-fall vdf-paper",Math.random()*100,null,13+Math.random()*10,Math.random()*2.2,9+Math.random()*4);
        for (i=0;i<6;i++) item("✦","vdf-fx-fall vdf-star",Math.random()*100,null,12+Math.random()*12,Math.random()*2,8+Math.random()*3);
    } else if (type === "diwali") {
        for (i=0;i<18;i++) {
            el=item("","vdf-firework",8+Math.random()*84,8+Math.random()*55,1,Math.random()*1.8,1.5+Math.random()*1.2);
        }
        for (i=0;i<24;i++) item(i%3===0?"🪔":"✦","vdf-fx-rise vdf-star",Math.random()*100,null,18+Math.random()*20,Math.random()*1.1,3.2+Math.random()*2);
    } else if (type === "holi") {
        for (i=0;i<55;i++) {
            el=item("","vdf-fx-pop vdf-holi-dot",Math.random()*100,Math.random()*90,12+Math.random()*42,Math.random()*1.2,2+Math.random()*2);
            el.style.width=el.style.fontSize; el.style.height=el.style.fontSize; el.style.background=colors[i%colors.length]; el.style.color=colors[i%colors.length];
        }
    } else if (type === "christmas") {
        for (i=0;i<42;i++) item(i%4===0?"⭐":(i%5===0?"🎄":"❄"),"vdf-fx-fall vdf-star",Math.random()*100,null,15+Math.random()*22,Math.random()*1.2,4+Math.random()*3);
    } else if (type === "sankranti") {
        for (i=0;i<28;i++) item(i%4===0?"☀":"🪁","vdf-fx-fall vdf-kite",Math.random()*100,null,22+Math.random()*24,Math.random(),4+Math.random()*3);
    } else if (type === "bhogi") {
        for (i=0;i<34;i++) item(i%5===0?"✨":"🔥","vdf-fx-rise",Math.random()*100,null,20+Math.random()*28,Math.random(),3+Math.random()*2.5);
    } else if (type === "ugadi") {
        for (i=0;i<38;i++) item(i%3===0?"🌼":(i%3===1?"🌿":"🌸"),"vdf-fx-fall",Math.random()*100,null,17+Math.random()*20,Math.random(),4+Math.random()*2.5);
    } else if (type === "ganesha") {
        for (i=0;i<34;i++) item(i%3===0?"🪷":(i%3===1?"🌺":"✨"),"vdf-fx-fall",Math.random()*100,null,18+Math.random()*22,Math.random(),4+Math.random()*2.5);
    } else if (type === "shiva") {
        for (i=0;i<10;i++) item("🔱","vdf-fx-fall vdf-trishul",Math.random()*100,null,19+Math.random()*15,Math.random()*2,8+Math.random()*4);
        for (i=0;i<9;i++) item(i%2===0?"▰":"▱","vdf-fx-fall vdf-paper",Math.random()*100,null,13+Math.random()*9,Math.random()*2.2,9+Math.random()*4);
        for (i=0;i<5;i++) item("✦","vdf-fx-fall vdf-star",Math.random()*100,null,12+Math.random()*11,Math.random()*2,8+Math.random()*3);
    } else if (type === "rama") {
        for (i=0;i<30;i++) item(i%3===0?"🏹":"✦","vdf-fx-fall vdf-star",Math.random()*100,null,18+Math.random()*22,Math.random(),4+Math.random()*2.5);
    } else if (type === "krishna") {
        for (i=0;i<32;i++) item(i%3===0?"🦚":(i%3===1?"🌼":"✦"),"vdf-fx-fall",Math.random()*100,null,18+Math.random()*22,Math.random(),4+Math.random()*2.5);
    } else if (type === "naga") {
        for (i=0;i<28;i++) item(i%3===0?"🪔":"🌼","vdf-fx-fall",Math.random()*100,null,18+Math.random()*20,Math.random(),4+Math.random()*2.5);
    } else if (type === "subrahmanya") {
        for (i=0;i<26;i++) item(i%3===0?"🦚":(i%3===1?"🔱":"✦"),"vdf-fx-fall vdf-star",Math.random()*100,null,17+Math.random()*20,Math.random(),4+Math.random()*2.5);
    } else {
        for (i=0;i<30;i++) item("✦","vdf-fx-fall vdf-star",Math.random()*100,null,15+Math.random()*20,Math.random(),4+Math.random()*2);
    }
    setTimeout(function(){ if(layer.parentNode) layer.parentNode.removeChild(layer); }, 8500);
}

function getVDFFestivalArt(type) {
    var gold = "#e9c56a", dark = "#090909", soft = "#8f6f2b";
    var commonStart = '<svg viewBox="0 0 160 160" role="img" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="80" r="73" fill="'+dark+'" stroke="'+gold+'" stroke-width="2"/><circle cx="80" cy="80" r="62" fill="none" stroke="'+soft+'" stroke-width="1" opacity=".55"/>';
    var end = '</svg>';

    if (type === "durga") return commonStart +
      '<path d="M80 25c13 11 22 25 22 41 0 9-4 17-10 23l8 28-20-13-20 13 8-28c-6-6-10-14-10-23 0-16 9-30 22-41z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+
      '<circle cx="80" cy="65" r="20" fill="none" stroke="'+gold+'" stroke-width="2"/>'+
      '<path d="M70 64h20M75 72c4 4 6 4 10 0M80 45v-18M73 33h14M80 27l-7 9M80 27l7 9" fill="none" stroke="'+gold+'" stroke-width="2.5" stroke-linecap="round"/>'+end;
    if (type === "lakshmi") return commonStart +
      '<path d="M80 42c-14 14-15 29 0 41 15-12 14-27 0-41zM80 83c-22-14-38-6-42 10 19 4 32 1 42-10zm0 0c22-14 38-6 42 10-19 4-32 1-42-10zM80 83c-14 13-15 29 0 39 15-10 14-26 0-39z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+
      '<circle cx="80" cy="64" r="8" fill="'+gold+'"/>'+end;
    if (type === "ganesha") return commonStart +
      '<path d="M65 53c-13 5-18 17-14 29 4 12 15 18 27 15 7-2 11-7 13-13 2 12 9 21 20 23-5-7-7-14-5-21 4-13-3-29-16-34-9-4-17-3-25 1z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+
      '<path d="M79 69c11 8 12 20 4 30-5 7-4 14 3 20M58 62c-10-9-20-4-21 8 8-5 14-4 20 2M96 58c10-8 20-2 20 10-8-5-14-4-20 2" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+
      '<circle cx="70" cy="68" r="2.5" fill="'+gold+'"/><circle cx="91" cy="68" r="2.5" fill="'+gold+'"/>'+end;
    if (type === "shiva") return commonStart +
      '<path d="M80 31v77M69 42h22M80 31l-9 13M80 31l9 13M62 108h36M68 116h24" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+
      '<path d="M57 61c13-12 33-12 46 0-7 7-15 10-23 10s-16-3-23-10z" fill="none" stroke="'+gold+'" stroke-width="2"/>'+
      '<path d="M58 48c7-8 16-12 27-10" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+end;
    if (type === "krishna") return commonStart +
      '<path d="M52 105c24-12 42-34 55-65M54 95c15 7 28 15 38 26" fill="none" stroke="'+gold+'" stroke-width="4" stroke-linecap="round"/>'+
      '<path d="M103 40c9-13 20-14 25-7-4 10-13 15-25 7zm2 2c13 0 21 7 20 16-11 4-20-1-20-16z" fill="none" stroke="'+gold+'" stroke-width="2"/>'+
      '<circle cx="58" cy="101" r="4" fill="'+gold+'"/>'+end;
    if (type === "rama") return commonStart +
      '<path d="M53 115c26-19 42-49 49-83M51 113c-8-26-5-49 9-69M54 79h49M103 79l-12-8M103 79l-12 8" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+end;
    if (type === "surya") return commonStart +
      '<circle cx="80" cy="80" r="28" fill="none" stroke="'+gold+'" stroke-width="3"/>'+
      '<circle cx="80" cy="80" r="8" fill="'+gold+'"/>'+
      '<path d="M80 32v13M80 115v13M32 80h13M115 80h13M46 46l9 9M105 105l9 9M114 46l-9 9M55 105l-9 9" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+end;
    if (type === "naga") return commonStart +
      '<path d="M80 116c-21-12-24-31-7-42 12-8 15-17 7-29-8 12-5 21 7 29 17 11 14 30-7 42z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+
      '<path d="M63 48c4-14 12-20 17-20s13 6 17 20c-11-7-23-7-34 0z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+end;
    if (type === "subrahmanya") return commonStart +
      '<path d="M80 30v82M69 43h22M80 30l-9 13M80 30l9 13M61 112h38" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+
      '<path d="M52 91c12-18 26-26 42-24 10 1 18 6 24 15-15-5-28-3-39 7-8 7-17 9-27 2z" fill="none" stroke="'+gold+'" stroke-width="2.4"/>'+
      '<circle cx="110" cy="76" r="3.5" fill="'+gold+'"/>'+end;
    if (type === "star") return commonStart +
      '<path d="M80 36l11 28 30 2-23 19 8 29-26-16-26 16 8-29-23-19 30-2z" fill="none" stroke="'+gold+'" stroke-width="3"/>'+end;
    return commonStart +
      '<path d="M80 37v76M57 67h46M62 113h36M68 121h24" fill="none" stroke="'+gold+'" stroke-width="3" stroke-linecap="round"/>'+
      '<path d="M65 57c5-12 25-12 30 0" fill="none" stroke="'+gold+'" stroke-width="3"/>'+end;
}


window.addEventListener("DOMContentLoaded", function() {

    initVDFFestivalGreeting();

    var homePage = document.getElementById("home");
    if (homePage) {
        homePage.classList.add("home-animate");
    }

    /* Do not run the calculator automatically on site load.
       A blank calculator must not show the amount validation alert.
       Validation runs only when the user clicks Calculate/Apply. */
    resetApplicationForm();

    /* Status page: entering/changing an ID must NEVER auto-load details.
       The result is cleared immediately and is shown only after Check Status. */
    var statusIdField = document.getElementById("statusId");
    var statusResult = document.getElementById("statusResult");
    if (statusIdField) {
        statusIdField.addEventListener("input", function() {
            if (statusResult) statusResult.innerHTML = "";
            updateStatusTimeGreeting("");
            window.vdfLastStatusFingerprint = null;
            window.vdfSelectedStatusTab = "overview";
        });
    }

    if (sessionStorage.getItem("vdfAdmin") === "true") {
        // Admin session remains available in this browser tab.
    }

});

