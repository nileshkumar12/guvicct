const express = require("express");
const mysql = require("mysql2");
const app = express();
const PORT = 3306;

app.use(express.json());

const db = mysql.createConnection({
  host: "linux711.hostguy.com",
  port: 3306,
  user: "vedikche_react_ecommerce_app",
  password: "*9g+Nh_OR;ME_)oD;",
  database: "vedikche_react_ecommerce_app",

});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.code, err.message);
  } else {
    console.log("✅ Database connected successfully!");
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to Express + MySQL API 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
