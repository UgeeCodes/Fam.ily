//reset password page
import React, { useState } from "react";
import styles from "../css/forgot.module.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";

const Forgot = () => {
  const [newPassword, SetNewPassword] = useState("");
  let navigate = useNavigate();
  const routeToLogin = (e) => {
    e.preventDefault();
    navigate("/");
  };

  const handleReset = async (e) => {
    console.log(newPassword);
    let email = localStorage.getItem("email");
    e.preventDefault();
    axios
      .post(`${API_BASE_URL}/changepw`, {
        newPassword,
        email,
      })
      .then((res) => {
        if (res.status === 200) {
          alert("Password Reset Successfully!!!!!!");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h1 className={styles.h1}>Reset Password</h1>
        <form method="POST" onSubmit={routeToLogin}>
          <label>
            <span>New Password</span>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => SetNewPassword(e.target.value)}
            />
          </label>
          <button onClick={handleReset} className={styles.button} type="submit">
            Reset Password
          </button>
          <Link className={styles.link} to="/login">
            Login
          </Link>
        </form>
      </div>
    </div>
  );
};
export default Forgot;
