const transactionPackageSize = 12;

function sendPendingTransactions(
  pendingTransaction,
  transaction,
  fromTelemetry
) {
  // Pending Transactions: We got the timestamp, but never got the confirmation
  queryObject = {};
  queryObject.HeaderDate = pendingTransaction[0].Timestamp;
  queryObject.Date_Time = pendingTransaction[2].Time; // TODO Should this be changed to Date_Time?
  const queryString = new URLSearchParams(queryObject);
  const confirmationDetails =
    serverLocation + "/confirm?" + queryString.toString();
  fetch(confirmationDetails, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json()) //Send the query string
    .then((data) => {
      console.log("Server Response:", data);
      if (data == "Confirmed") {
        pendingTransaction.splice(1);
        pendingTransaction[0] = 0;
        localStorage.setItem(
          "pendingTransaction",
          JSON.stringify(pendingTransaction)
        );
      } else if (data == "Not Confirmed") {
        // We got the Timestamp, but the database cannot find the data so we put it
        // back into the transaction pipeline
        transaction.push(pendingTransaction.splice(2));
        transaction[0] += pendingTransaction[1];
        localStorage.setItem("transaction", JSON.stringify(transaction));
        pendingTransaction[0] = 0;
        localStorage.setItem(
          "pendingTransaction",
          JSON.stringify(pendingTransaction)
        );
        if (fromTelemetry == true) {
          sendTransactions(transaction);
        } else {
          // TODO there seems to be a problem with the database.
          console.log("Cannot handle Pending Transactions 1");
        }
      } else {
        // TODO there should be an error handling routine here
        // probably because the database is down
        console.log("Cannot handle Pending Transactions 2");
      }
    })
    .catch((error) => console.log("Confirmation Transmition Error", error));
}

function sendTransactions(transaction) {
  if (transaction[0] > 0) {
    fetch(serverLocation + "/insert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transaction),
    })
      .then((res) => res.json()) //Send the transaction
      .then((data) => {
        console.log("Server Response:", data);
        if (data.Timestamp != 0) {
          // Pending transaction[0]= timestamp object
          // Pending transaction[1]= number of transactions
          // Pending transaction[2-(n+1)]= rows of transactions
          pendingTransaction[0] = data;
          transaction.forEach((item) => {
            pendingTransaction.push(item);
          });
          const promise1 = Promise.resolve(() => {
            localStorage.setItem(
              "pendingTransaction",
              JSON.stringify(pendingTransaction)
            );
          });
          promise1
            .then(() => {
              transaction.splice(1);
              transaction[0] = 0;
              localStorage.setItem("transaction", JSON.stringify(transaction));
            })
            .then(() => {
              sendPendingTransactions(pendingTransaction, transaction, false);
            });
        } else {
          console.log("Database not ready");
        }
      })
      .catch((error) => {
        console.log("Transmission Error", error);
      });
  }
}

function sendTelemetry(transaction, pendingTransaction) {
  if (pendingTransaction[0] == 0) {
    sendTransactions(transaction);
  } else {
    sendPendingTransactions(pendingTransaction, transaction, true);
  }
}

function attachEvents() {
  // Attach Events
  myCarouselElement.addEventListener("slid.bs.carousel", (event) => {
    pageCurrent = event.to;
    localStorage.setItem("pageCurrent", event.to);

    // Build Transaction
    const DateObject = Date.now();

    // Build a Transaction package to send to server
    // transaction[0]=#transactions
    // transaction[1-n]= entire transaction row
    transaction[0] = transaction[0] + 1;
    let transactionEntry = {
      Time: DateObject,
      Milestone_ID: 1,
      Completion_Level: pageCurrent,
    };
    transaction.push(transactionEntry);
    const promise1 = Promise.resolve(() => {
      localStorage.setItem("transaction", JSON.stringify(transaction));
    });
    promise1.then(() => {
      if (transaction[0] % transactionPackageSize == 0) {
        sendTelemetry(transaction, pendingTransaction);
      }
    });
  });
}

// Startup and Initialization
transaction = [];
transaction[0] = 0;
pendingTransaction = [];
pendingTransaction[0] = 0;
const myCarouselElement = document.getElementById("myCarousel");
let pageCurrent;

//  "http://99.233.12.190:3000"; "http://192.168.0.13:3000"; "http://192.168.0.2:3000";

const serverLocation = "http://99.233.12.190:3000";

if (!localStorage.getItem("pageCurrent")) {
  localStorage.setItem("pageCurrent", "0");
  localStorage.setItem("transaction", JSON.stringify(transaction));
  localStorage.setItem(
    "pendingTransaction",
    JSON.stringify(pendingTransaction)
  );
  attachEvents();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pageCurrent = parseInt(localStorage.getItem("pageCurrent"));
    transaction = JSON.parse(localStorage.getItem("transaction"));
    if (!transaction) {
      transaction[0] = 0;
      localStorage.setItem("transaction", JSON.stringify(transaction));
    }
    pendingTransaction = JSON.parse(localStorage.getItem("pendingTransaction"));
    if (!pendingTransaction) {
      pendingTransaction[0] = 0;
      localStorage.setItem(
        "pendingTransaction",
        JSON.stringify(pendingTransaction)
      );
    }
    const myCarouselRegion = document.querySelector("#myCarousel");
    const myCarouselTag = new bootstrap.Carousel(myCarouselRegion);
    myCarouselTag.to(pageCurrent);
    attachEvents();
  });
}

// Speculative Feature: WebRTC
console.log(window.location.search);
